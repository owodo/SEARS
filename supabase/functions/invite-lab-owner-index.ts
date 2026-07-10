import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteLabOwnerRequest {
  email: string;
  firstName: string;
  lastName: string;
  labId: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization header" }, 401);
    }

    // Admin client — full DB access, used to create the user
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Anon client — used only to verify who is calling
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const {
      data: { user: caller },
      error: authError,
    } = await supabaseAuth.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !caller) {
      return json({ error: "Unauthorized" }, 401);
    }

    // Only a universal_owner may invite lab owners
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (profileError || !callerProfile) {
      return json({ error: "Could not verify your profile" }, 403);
    }

    if (callerProfile.role !== "universal_owner") {
      return json(
        { error: "Only universal owners can invite lab owners" },
        403
      );
    }

    const { email, firstName, lastName, labId }: InviteLabOwnerRequest =
      await req.json();

    if (!email || !firstName || !lastName || !labId) {
      return json(
        { error: "Missing required fields: email, firstName, lastName, labId" },
        400
      );
    }

    // Confirm the lab actually exists
    const { data: lab, error: labError } = await supabaseAdmin
      .from("labs")
      .select("id, name")
      .eq("id", labId)
      .single();

    if (labError || !lab) {
      return json({ error: "Lab not found" }, 404);
    }

    // Reject if this lab already has an owner
    const { data: existingOwner } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("lab_id", labId)
      .eq("role", "lab_owner")
      .maybeSingle();

    if (existingOwner) {
      return json(
        {
          error: `Lab "${lab.name}" already has an owner (${existingOwner.email}).`,
        },
        409
      );
    }

    const tempPassword = "TempPassword123!";

    // Admin API — creates the user WITHOUT touching the caller's session
    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true, // no confirmation email needed
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role: "lab_owner",
          lab_id: labId,
        },
      });

    if (createError) {
      console.error("createUser failed:", createError);
      return json({ error: createError.message }, 400);
    }

    // The handle_new_user trigger creates the profile row.
    // Set role + lab_id explicitly so nothing depends on trigger behaviour.
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        role: "lab_owner",
        lab_id: labId,
        first_name: firstName,
        last_name: lastName,
        is_active: true,
      })
      .eq("user_id", newUser.user.id);

    if (updateError) {
      console.error("profile update failed:", updateError);
      return json(
        {
          error:
            "User created but profile could not be linked to the lab. Fix manually in Supabase.",
        },
        500
      );
    }

    // Optional invitation email (only if RESEND_API_KEY is configured)
    try {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const origin = req.headers.get("origin") || "";
        const loginUrl = `${origin}/auth`;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "SEARS <noreply@yourdomain.com>",
            to: [email],
            subject: `You've been invited to lead ${lab.name} on SEARS`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #0A3D43;">Welcome to SEARS</h1>
                <p>Hi ${firstName},</p>
                <p>You've been invited as the <strong>Lab Owner</strong> of <strong>${lab.name}</strong>.</p>
                <div style="text-align:center;margin:30px 0;">
                  <a href="${loginUrl}" style="background:#028090;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">Log in to SEARS</a>
                </div>
                <h3>Your credentials</h3>
                <ul>
                  <li><strong>Email:</strong> ${email}</li>
                  <li><strong>Temporary password:</strong> ${tempPassword}</li>
                </ul>
                <p style="color:#c53030;"><strong>Please change your password after first login.</strong></p>
              </div>
            `,
          }),
        });
      }
    } catch (emailError) {
      // Non-critical: the account exists either way
      console.error("email send failed (non-critical):", emailError);
    }

    return json({
      success: true,
      message: `${firstName} ${lastName} is now the lab owner of ${lab.name}`,
      userId: newUser.user.id,
      labName: lab.name,
      tempPassword,
    });
  } catch (error: any) {
    console.error("invite-lab-owner error:", error);
    return json({ error: error.message }, 500);
  }
};

serve(handler);

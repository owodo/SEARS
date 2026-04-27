import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  firstName: string;
  lastName: string;
  labId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the caller is authenticated and is a lab_owner
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create admin client with service role key (has full access)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Create a regular client to verify the caller's identity
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    // Verify the caller is a lab_owner
    const { data: { user: caller }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check caller's role
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role, lab_id")
      .eq("user_id", caller.id)
      .single();

    if (profileError || !callerProfile) {
      return new Response(
        JSON.stringify({ error: "Could not verify your profile" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (callerProfile.role !== "lab_owner" && callerProfile.role !== "universal_owner") {
      return new Response(
        JSON.stringify({ error: "Only lab owners can invite scientists" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { email, firstName, lastName, labId }: InviteRequest = await req.json();

    if (!email || !firstName || !lastName || !labId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, firstName, lastName, labId" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify the lab owner actually owns this lab
    if (callerProfile.role === "lab_owner" && callerProfile.lab_id !== labId) {
      return new Response(
        JSON.stringify({ error: "You can only invite scientists to your own lab" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Use admin API to create user — does NOT affect the caller's session
    const tempPassword = "TempPassword123!";

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Skip email verification
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: "scientist",
        lab_id: labId,
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // The handle_new_user trigger will create the profile,
    // but it doesn't set lab_id. So we set it explicitly here.
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        lab_id: labId,
        role: "scientist",
        first_name: firstName,
        last_name: lastName,
        is_active: true,
      })
      .eq("user_id", newUser.user.id);

    if (updateError) {
      console.error("Error updating profile with lab_id:", updateError);
      // User was created but profile update failed — log but don't fail entirely
    }

    // Optionally send invitation email via Resend
    try {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const callerName = `${callerProfile.role === 'lab_owner' ? 'Your Lab Owner' : 'Admin'}`;
        const loginUrl = `${req.headers.get("origin") || "https://sears-v2.vercel.app"}/auth`;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "SEARS <noreply@yourdomain.com>",
            to: [email],
            subject: "You've been invited to join SEARS as a Scientist",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #333;">Welcome to SEARS!</h1>
                <p>Hi ${firstName},</p>
                <p>You've been invited by ${callerName} to join SEARS as a <strong>Scientist</strong>.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${loginUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                    Login to SEARS
                  </a>
                </div>
                <h3>Your credentials:</h3>
                <ul>
                  <li><strong>Email:</strong> ${email}</li>
                  <li><strong>Password:</strong> ${tempPassword}</li>
                </ul>
                <p style="color: #dc2626;"><strong>Please change your password after first login.</strong></p>
              </div>
            `,
          }),
        });
      }
    } catch (emailError) {
      console.error("Email send failed (non-critical):", emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Scientist ${firstName} ${lastName} invited successfully`,
        userId: newUser.user.id,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in invite-scientist:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

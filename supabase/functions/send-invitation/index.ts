import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  inviterName: string;
  loginUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName, role, inviterName, loginUrl }: InvitationRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "LabForge <noreply@yourdomain.com>", // Replace with your verified domain
      to: [email],
      subject: `You've been invited to join LabForge as a ${role.replace('_', ' ')}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">Welcome to LabForge!</h1>
          
          <p>Hi ${firstName},</p>
          
          <p>You've been invited by ${inviterName} to join LabForge as a <strong>${role.replace('_', ' ')}</strong>.</p>
          
          <p>LabForge is a comprehensive laboratory management system that helps scientists track experiments, manage data, and collaborate effectively.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" 
               style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Accept Invitation & Login
            </a>
          </div>
          
          <h3>Your account details:</h3>
          <ul>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Temporary Password:</strong> TempPassword123!</li>
            <li><strong>Role:</strong> ${role.replace('_', ' ')}</li>
          </ul>
          
          <p style="color: #dc2626; font-weight: bold;">⚠️ Important: Please change your password after your first login for security.</p>
          
          <p>If you have any questions, please don't hesitate to reach out to your lab administrator.</p>
          
          <p>Best regards,<br>The LabForge Team</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280; text-align: center;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    console.log("Invitation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
import type { Metadata } from "next";

export const metadata: Metadata = {
  other: {
    "tiktok-developers-site-verification": "mwzkvY1inrMeVXOxR4kIfD21NSIVComI",
  },
};

export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto p-8 text-gray-800">
      <h1 className="text-3xl font-black mb-6">Privacy Policy</h1>
      <p className="mb-4 text-gray-500 font-medium">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6 text-sm leading-relaxed">
        <p>Welcome to Content Trend Intelligence. This Privacy Policy explains how we collect, use, and protect your information when you use our application.</p>

        <div>
          <h2 className="text-lg font-bold mb-2">1. Information We Collect</h2>
          <p>When you connect your social media accounts (TikTok, YouTube, Instagram), we collect basic profile information and authentication tokens necessary to provide our services. We do not collect or store your actual passwords for these platforms.</p>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">2. How We Use Your Information</h2>
          <p>We use your information strictly to facilitate video uploads, generate trend insights, and manage your content on your behalf. We only perform actions that you explicitly authorize through our dashboard.</p>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">3. Data Sharing</h2>
          <p>We do not sell, rent, or share your personal data or authentication tokens with third parties, except as required to interact with the official APIs of the platforms you connect (TikTok, YouTube, Instagram).</p>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">4. Data Security</h2>
          <p>We implement standard security measures to protect your authentication tokens and personal information stored in our database.</p>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">5. Data Deletion & Revocation</h2>
          <p className="mb-2">You have the right to request the deletion of your data at any time. You can do this by:</p>
          <ul className="list-disc pl-5 mb-2">
            <li>Removing your connected accounts directly from our dashboard.</li>
            <li>Revoking our app's access from your TikTok Security settings.</li>
            <li>Contacting us directly (see below) to request full account data deletion.</li>
          </ul>
          <p>Once requested, all associated authentication tokens and personal data will be permanently deleted from our database within 7 days.</p>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">6. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy or wish to request data deletion, please contact us at: <strong>support@ClipperBudi.com</strong> (or your provided support email).</p>
        </div>
      </div>
    </div>
  );
}

export default function TermsOfService() {
  return (
    <div className="max-w-3xl mx-auto p-8 text-gray-800">
      <h1 className="text-3xl font-black mb-6">Terms of Service</h1>
      <p className="mb-4 text-gray-500 font-medium">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6 text-sm leading-relaxed">
        <p>Welcome to Content Trend Intelligence. By using our application, you agree to these terms.</p>

        <div>
          <h2 className="text-lg font-bold mb-2">1. Description of Service</h2>
          <p>We provide a tool to help creators analyze trends, generate content, and publish videos across multiple platforms including TikTok, YouTube, and Instagram.</p>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">2. User Responsibilities</h2>
          <p>You are responsible for the content you publish through our platform. You must ensure your content complies with the terms, conditions, and community guidelines of the respective social media platforms (TikTok, YouTube, Instagram).</p>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">3. API Usage</h2>
          <p>Our application uses official APIs from third-party platforms. By connecting your accounts, you agree to abide by their respective Terms of Service.</p>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">4. Limitation of Liability</h2>
          <p>This application is provided "as is". We are not responsible for any account suspensions, content removals, or other issues arising from the use of our automated posting features on third-party platforms.</p>
        </div>
      </div>
    </div>
  );
}

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { platform, email, password } = await req.json();
    const envPath = path.join(process.cwd(), '.env');
    
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    if (platform === 'instagram') {
      envContent = envContent.replace(/^IG_USERNAME=.*$/gm, '');
      envContent = envContent.replace(/^IG_PASSWORD=.*$/gm, '');
      envContent += `\nIG_USERNAME=${email}\nIG_PASSWORD=${password}\n`;
    } else if (platform === 'tiktok') {
      envContent = envContent.replace(/^TIKTOK_SESSION_ID=.*$/gm, '');
      envContent += `\nTIKTOK_SESSION_ID=${email}\n`; // we'll use 'email' field to pass the session ID
    }

    envContent = envContent.replace(/\n\s*\n/g, '\n');
    fs.writeFileSync(envPath, envContent.trim() + '\n');

    return NextResponse.json({ success: true, message: 'Kredensial berhasil disimpan ke .env' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save credentials' }, { status: 500 });
  }
}

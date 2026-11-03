import fs from "fs";
import path from "path";
import crypto from "crypto";

export type PublisherProfileData = {
  id: string;
  name: string;
  targetKeyword: string;
  category?: string | null;
  youtubeConnected: boolean;
  tiktokConnected: boolean;
  instagramConnected: boolean;
  facebookConnected: boolean;
  threadsConnected: boolean;
  igUsername?: string | null;
  igPassword?: string | null;
  instagramToken?: string | null;
  instagramUserId?: string | null;
  instagramTokenExpiresAt?: string | null;
  facebookPageId?: string | null;
  facebookPageName?: string | null;
  facebookToken?: string | null;
  facebookTokenExpiresAt?: string | null;
  threadsUserId?: string | null;
  threadsUsername?: string | null;
  threadsToken?: string | null;
  threadsTokenExpiresAt?: string | null;
  tiktokCookies?: string | null;
  youtubeToken?: string | null;
  youtubeRefreshToken?: string | null;
  youtubeChannelTitle?: string | null;
  createdAt: string;
};

class ProfileStore {
  private filePath: string;

  constructor() {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (err) {
        console.error("Gagal membuat folder data:", err);
      }
    }
    this.filePath = path.join(dataDir, "profiles.json");
    this.ensureFile();
  }

  private ensureFile() {
    try {
      if (!fs.existsSync(this.filePath)) {
        fs.writeFileSync(this.filePath, JSON.stringify([], null, 2), "utf8");
      }
    } catch (err) {
      console.error("Gagal inisialisasi profiles.json:", err);
    }
  }

  private readAll(): PublisherProfileData[] {
    try {
      this.ensureFile();
      const content = fs.readFileSync(this.filePath, "utf8");
      return JSON.parse(content || "[]");
    } catch (err) {
      console.error("Gagal membaca profiles.json:", err);
      return [];
    }
  }

  private writeAll(profiles: PublisherProfileData[]) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(profiles, null, 2), "utf8");
    } catch (err) {
      console.error("Gagal menyimpan ke profiles.json:", err);
    }
  }

  async getProfiles(): Promise<PublisherProfileData[]> {
    const list = this.readAll();
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createProfile(data: {
    name: string;
    targetKeyword: string;
    category?: string | null;
    youtubeConnected?: boolean;
    tiktokConnected?: boolean;
    instagramConnected?: boolean;
    facebookConnected?: boolean;
    threadsConnected?: boolean;
  }): Promise<PublisherProfileData> {
    const profiles = this.readAll();
    const newProfile: PublisherProfileData = {
      id: crypto.randomUUID(),
      name: data.name,
      targetKeyword: data.targetKeyword,
      category: data.category || null,
      youtubeConnected: data.youtubeConnected ?? false,
      tiktokConnected: data.tiktokConnected ?? false,
      instagramConnected: data.instagramConnected ?? false,
      facebookConnected: data.facebookConnected ?? false,
      threadsConnected: data.threadsConnected ?? false,
      createdAt: new Date().toISOString()
    };
    profiles.unshift(newProfile);
    this.writeAll(profiles);
    return newProfile;
  }

  async updateProfile(id: string, patch: Partial<PublisherProfileData>): Promise<PublisherProfileData | null> {
    const profiles = this.readAll();
    const index = profiles.findIndex(p => p.id === id);
    if (index === -1) return null;
    profiles[index] = { ...profiles[index], ...patch };
    this.writeAll(profiles);
    return profiles[index];
  }

  async deleteProfile(id: string): Promise<boolean> {
    const profiles = this.readAll();
    const filtered = profiles.filter(p => p.id !== id);
    this.writeAll(filtered);
    return true;
  }
}

export const profileStore = new ProfileStore();


const fs = require('fs');

const path = 'src/services/YouTubeService.ts';
let code = fs.readFileSync(path, 'utf8');

const mapping = `
  private static YOUTUBE_CATEGORY_MAP: Record<string, string> = {
    "1": "Film & Animation",
    "2": "Autos & Vehicles",
    "10": "Music",
    "15": "Pets & Animals",
    "17": "Sports",
    "18": "Short Movies",
    "19": "Travel & Events",
    "20": "Gaming",
    "21": "Videoblogging",
    "22": "People & Blogs",
    "23": "Comedy",
    "24": "Entertainment",
    "25": "News & Politics",
    "26": "Howto & Style",
    "27": "Education",
    "28": "Science & Tech",
    "29": "Nonprofits & Activism",
    "30": "Movies",
    "31": "Anime/Animation",
    "32": "Action/Adventure",
    "33": "Classics",
    "34": "Comedy",
    "35": "Documentary",
    "36": "Drama",
    "37": "Family",
    "38": "Foreign",
    "39": "Horror",
    "40": "Sci-Fi/Fantasy",
    "41": "Thriller",
    "42": "Shorts",
    "43": "Shows",
    "44": "Trailers"
  };
`;

code = code.replace(
  'private static BASE_URL = "https://youtube.googleapis.com/youtube/v3";',
  'private static BASE_URL = "https://youtube.googleapis.com/youtube/v3";\n' + mapping
);

code = code.replace(
  'category: item.snippet.categoryId,',
  'category: this.YOUTUBE_CATEGORY_MAP[item.snippet.categoryId] || item.snippet.categoryId,'
);

fs.writeFileSync(path, code);

export interface VoiceLanguageOption {
  code: string;
  label: string;
  nativeLabel: string;
  shortLabel: string;
  samplePrompt: string;
}

export const VOICE_LANGUAGES: VoiceLanguageOption[] = [
  { code: "en-IN", label: "English", nativeLabel: "English", shortLabel: "EN", samplePrompt: "Black oversized t-shirt" },
  { code: "bn-IN", label: "Bengali", nativeLabel: "বাংলা", shortLabel: "বাং", samplePrompt: "কালো টি-শার্ট দেখাও" },
  { code: "hi-IN", label: "Hindi", nativeLabel: "हिन्दी", shortLabel: "हिं", samplePrompt: "काला टी-शर्ट दिखाओ" },
  { code: "ta-IN", label: "Tamil", nativeLabel: "தமிழ்", shortLabel: "த", samplePrompt: "கருப்பு டி-ஷர்ட்" },
  { code: "te-IN", label: "Telugu", nativeLabel: "తెలుగు", shortLabel: "తె", samplePrompt: "నల్ల టీ-షర్ట్" },
  { code: "mr-IN", label: "Marathi", nativeLabel: "मराठी", shortLabel: "म", samplePrompt: "काळा टी-शर्ट दाखवा" },
  { code: "gu-IN", label: "Gujarati", nativeLabel: "ગુજરાતી", shortLabel: "ગુ", samplePrompt: "કાળો ટી-શર્ટ" },
  { code: "kn-IN", label: "Kannada", nativeLabel: "ಕನ್ನಡ", shortLabel: "ಕ", samplePrompt: "ಕಪ್ಪು ಟೀ-ಶರ್ಟ್" },
  { code: "ml-IN", label: "Malayalam", nativeLabel: "മലയാളം", shortLabel: "മ", samplePrompt: "കറുത്ത ടീഷർട്ട്" },
  { code: "pa-IN", label: "Punjabi", nativeLabel: "ਪੰਜਾਬੀ", shortLabel: "ਪੰ", samplePrompt: "ਕਾਲੀ ਟੀ-ਸ਼ਰਟ" },
];

export const VOICE_LANG_STORAGE_KEY = "zebalpha_voice_lang";

export function mapAppLanguageToVoiceLang(appLang?: string | null): string {
  if (appLang === "bn") return "bn-IN";
  if (appLang === "hi") return "hi-IN";
  return "en-IN";
}

export function getVoiceLanguageMeta(code?: string | null): VoiceLanguageOption {
  return (
    VOICE_LANGUAGES.find((l) => l.code.toLowerCase() === String(code || "").toLowerCase()) ||
    VOICE_LANGUAGES[0]
  );
}

interface ConceptDef {
  canonical: string;
  synonyms: string[];
  aliases: string[];
}

const MULTILINGUAL_CONCEPTS: ConceptDef[] = [
  // Colors
  {
    canonical: "black",
    synonyms: ["black"],
    aliases: [
      "black", "kalo", "kala", "kale", "kali", "kalor", "kaala",
      "কালো", "কোলো", "কাল", "কালা", "काले", "काला", "काली",
      "கருப்பு", "నల్ల", "నలుపు", "काळा", "काळे", "કાળો", "કાળા",
      "ಕಪ್ಪು", "കറുത്ത", "ਕਾਲਾ", "ਕਾਲੀ", "काला रंग",
    ],
  },
  {
    canonical: "white",
    synonyms: ["white", "ivory", "off white"],
    aliases: [
      "white", "sada", "safed", "shada", "swet",
      "সাদা", "শাদা", "सफेद", "सफ़ेद", "श्वेत", "गोरा",
      "வெள்ளை", "తెల్ల", "తెలుపు", "पांढरा", "पांढरे", "સફેદ", "બીજું સફેદ",
      "ಬಿಳಿ", "വെള്ള", "ਚਿੱਟਾ", "ਸਫੈਦ",
    ],
  },
  {
    canonical: "red",
    synonyms: ["red", "crimson", "scarlet"],
    aliases: [
      "red", "lal", "laal",
      "লাল", "लाल", "சிவப்பு", "ఎరుపు", "एरुप्पु", "लाल रंग",
      "લાલ", "ಕೆಂಪು", "ചുവപ്പ്", "ਲਾਲ",
    ],
  },
  {
    canonical: "blue",
    synonyms: ["blue", "navy", "sky blue", "cobalt", "denim"],
    aliases: [
      "blue", "nil", "neela", "neele", "neeli", "akas", "akash",
      "নীল", "আকাশি", "নেভি", "नीला", "नीले", "नीली", "आसमानी",
      "நீலம்", "నీలం", "निळा", "निळे", "વાદળી", "નીલો",
      "ನೀಲಿ", "നീല", "ਨੀਲਾ", "ਨੀਲੀ",
    ],
  },
  {
    canonical: "navy",
    synonyms: ["navy", "navy blue", "dark blue"],
    aliases: ["navy", "navy blue", "নেভি ব্লু", "নেভি নীল", "नेवी ब्लू", "नेवी"],
  },
  {
    canonical: "green",
    synonyms: ["green", "olive", "mint", "emerald"],
    aliases: [
      "green", "sobuj", "sabuj", "hara", "hare", "hari", "olive",
      "সবুজ", "জলপাই", "हरा", "हरे", "हरी", "ऑलिव",
      "பச்சை", "ఆకుపచ్చ", "हिरवा", "हिरवे", "લીલો", "લીલું",
      "ಹಸಿರು", "പച്ച", "ਹਰਾ", "ਹਰੀ",
    ],
  },
  {
    canonical: "yellow",
    synonyms: ["yellow", "mustard", "gold", "champagne"],
    aliases: [
      "yellow", "holud", "halud", "peela", "pila", "peeli", "mustard",
      "হলুদ", "সোনালী", "সোনালি", "पीला", "पीले", "पीली", "सुनहरा",
      "மஞ்சள்", "పసుపు", "पिवळा", "पिवळे", "પીળો", "પીળું",
      "ಹಳದಿ", "മഞ്ഞ", "ਪੀਲਾ", "ਪੀਲੀ",
    ],
  },
  {
    canonical: "pink",
    synonyms: ["pink", "rose", "blush"],
    aliases: [
      "pink", "golapi", "gulabi",
      "গোলাপি", "গোলাপী", "गुलाबी",
      "இளஞ்சிவப்பு", "பிங்க்", "గులాబీ", "गुलाबी रंग", "ગુલાબી",
      "ಗುಲಾಬಿ", "പിങ്ക്", "ਗੁਲਾਬੀ",
    ],
  },
  {
    canonical: "purple",
    synonyms: ["purple", "lavender", "violet", "lilac"],
    aliases: [
      "purple", "beguni", "baingani", "lavender",
      "বেগুনি", "বেগুনী", "बैंगनी", "जामुनी", "जांभळा", "જાંબલી",
      "ஊதா", "ఊదా", "ನೇರಳೆ", "വയലറ്റ്", "ਜਾਮਨੀ",
    ],
  },
  {
    canonical: "grey",
    synonyms: ["grey", "gray", "charcoal", "ash"],
    aliases: [
      "grey", "gray", "dhushor", "slati", "charcoal",
      "ধূসর", "অ্যাশ", "গ্রে", "ग्रे", "स्लेटी", "भूरा-ग्रे", "राखाडी",
      "சாம்பல்", "బూడిద", "રાખોડી", "ಬೂದು", "ചാര", "ਸਲੇਟੀ",
    ],
  },
  {
    canonical: "brown",
    synonyms: ["brown", "tan", "coffee", "chocolate", "khaki"],
    aliases: [
      "brown", "badami", "bhura", "kofi", "chocolate", "khaki",
      "বাদামী", "বাদামি", "খয়েরি", "भूरा", "चॉकलेट", "तपकिरी",
      "பழுப்பு", "గోధుమ", "કથ્થઈ", "ಕಂದು", "തവിട്ട്", "ਭੂਰਾ",
    ],
  },
  {
    canonical: "beige",
    synonyms: ["beige", "cream", "ivory", "sand"],
    aliases: [
      "beige", "cream", "ivory", "ক্রিম", "বেইজ", "ক्रीम", "बेज",
    ],
  },
  {
    canonical: "orange",
    synonyms: ["orange", "rust", "coral"],
    aliases: [
      "orange", "komola", "narangi", "santra",
      "কমলা", "नारंगी", "संतरी", "भगवा", "केशरी",
      "ஆரஞ்சு", "నారింజ", "કેસરી", "ಕಿತ್ತಳೆ", "ഓറഞ്ച്", "ਸੰਤਰੀ",
    ],
  },
  {
    canonical: "maroon",
    synonyms: ["maroon", "wine", "burgundy"],
    aliases: ["maroon", "wine", "মেরুন", "মেজেন্টা", "मैरून", "मरून"],
  },

  // Garments & Footwear
  {
    canonical: "t-shirt",
    synonyms: ["t-shirt", "tshirt", "tee", "tees"],
    aliases: [
      "t-shirt", "tshirt", "t shirt", "tee", "tees", "genji", "ganji",
      "টি-শার্ট", "টি শার্ট", "টিশার্ট", "গেঞ্জি", "টিশার্টস",
      "टी-शर्ट", "टी शर्ट", "टीशर्ट", "गंजी",
      "டி-ஷர்ட்", "டி ஷர்ட்", "டீ-ஷர்ட்",
      "టీ-షర్ట్", "టీ షర్ట్",
      "टी-शर्ट", "ટી-શર્ટ", "ટી શર્ટ",
      "ಟೀ-ಶರ್ಟ್", "ಟೀ ಶರ್ಟ್",
      "ടീഷർട്ട്", "ടി ഷർട്ട്",
      "ਟੀ-ਸ਼ਰਟ", "ਟੀ ਸ਼ਰਟ",
    ],
  },
  {
    canonical: "oversized",
    synonyms: ["oversized", "oversize", "loose", "baggy", "drop shoulder"],
    aliases: [
      "oversized", "oversize", "baggy", "loose", "dhila", "dhiledhala", "khola",
      "ওভারসাইজড", "ওভারসাইজ", "ঢিলেঢালা", "ঢিলা",
      "ओवरसाइज्ड", "ओवरसाइज", "ढीला", "लूज", "बैगी",
    ],
  },
  {
    canonical: "polo",
    synonyms: ["polo", "polos", "zip polo", "collar tee"],
    aliases: [
      "polo", "polos", "পোলো", "পোলো টি-শার্ট", "পোলো শার্ট",
      "पोलो", "पोलो टी-शर्ट", "पोलो शर्ट", "कॉलर टी-शर्ट",
    ],
  },
  {
    canonical: "shirt",
    synonyms: ["shirt", "shirts"],
    aliases: [
      "shirt", "shirts", "jama", "kamij",
      "শার্ট", "জামা", "শার্টস",
      "शर्ट", "कमीज", "शर्ट्स",
      "சட்டை", "షर्ट్", "షర్ట్", "शर्ट", "શર્ટ", "ಶರ್ಟ್", "ഷർട്ട്", "ਸ਼ਰਟ",
    ],
  },
  {
    canonical: "hoodie",
    synonyms: ["hoodie", "hoodies", "sweatshirt", "sweatshirts"],
    aliases: [
      "hoodie", "hoodies", "hoody", "sweatshirt", "sweatshirts",
      "হুডি", "হুডিস", "সোয়েটশার্ট", "শীতের জামা",
      "हुडी", "हूडी", "हुडीज", "स्वेटशर्ट",
      "ஹூடி", "హుడీ", "हूडी", "હુડી", "ಹೂಡಿ", "ഹൂഡി", "ਹੁੱਡੀ",
    ],
  },
  {
    canonical: "jacket",
    synonyms: ["jacket", "jackets", "overshirt", "shacket"],
    aliases: [
      "jacket", "jackets", "overshirt",
      "জ্যাকেট", "ওভারশার্ট", "जैकेट", "ओवरशर्ट",
      "ஜாக்கெட்", "జాకెట్", "जॅकेट", "જેકેટ", "ಜಾಕೆಟ್", "ജാക്കറ്റ്", "ਜੈਕਟ",
    ],
  },
  {
    canonical: "jeans",
    synonyms: ["jeans", "jean", "denim", "denims"],
    aliases: [
      "jeans", "jean", "denim", "denims",
      "জিন্স", "জিনস", "ডেনিম", "जींस", "जीन्स", "डेनिम",
      "ஜீன்ஸ்", "జీన్స్", "जीन्स", "જીન્સ", "ಜೀನ್ಸ್", "ജീൻസ്", "ਜੀਨਸ",
    ],
  },
  {
    canonical: "pants",
    synonyms: ["pant", "pants", "trouser", "trousers"],
    aliases: [
      "pant", "pants", "trouser", "trousers", "pyjama",
      "প্যান্ট", "ট্রাউজার", "पैंट", "ट्राउजर", "पतलून",
      "பேண்ட்", "ప్యాంట్", "पँट", "પેન્ટ", "ಪ್ಯಾಂಟ್", "പാന്റ്", "ਪੈਂਟ",
    ],
  },
  {
    canonical: "cargo",
    synonyms: ["cargo", "cargos", "cargo pant"],
    aliases: ["cargo", "cargos", "কার্গো", "কার্গো প্যান্ট", "कार्गो", "कार्गो पैंट"],
  },
  {
    canonical: "joggers",
    synonyms: ["jogger", "joggers", "trackpant", "track pant", "lower"],
    aliases: [
      "jogger", "joggers", "trackpant", "track pant", "lower", "lowers",
      "জগার", "জগার্স", "ট্র্যাক প্যান্ট", "লোয়ার",
      "जॉगर", "जॉगर्स", "ट्रैक पैंट", "लोअर",
    ],
  },
  {
    canonical: "shorts",
    synonyms: ["short", "shorts", "half pant"],
    aliases: [
      "shorts", "half pant", "nikker",
      "শর্টস", "হাফ প্যান্ট", "हाफ पैंट", "शॉर्ट्स", "निकर",
    ],
  },
  {
    canonical: "clogs",
    synonyms: ["clog", "clogs", "croc", "crocs"],
    aliases: [
      "clog", "clogs", "croc", "crocs", "crox", "klogs",
      "ক্রকস", "ক্রক্স", "ক্লগ", "ক্লগস", "প্ল্যাটফর্ম ক্লগ",
      "क्रॉक्स", "क्रॉक्स जूते", "क्लॉग", "क्लॉग्स",
      "க்ராக்ஸ்", "క్రాక్స్", "क्रॉक्स", "ક્રોક્સ", "ಕ್ರಾಕ್ಸ್", "ക്രോക്സ്",
    ],
  },
  {
    canonical: "shoes",
    synonyms: ["shoe", "shoes", "sneaker", "sneakers", "footwear", "clog", "clogs", "crocs"],
    aliases: [
      "shoe", "shoes", "sneaker", "sneakers", "footwear", "boot", "boots",
      "juto", "juta", "joota", "jootay", "jute",
      "জুতো", "জুতা", "স্নিকার", "স্নিকার্স", "পায়ে পরার জুতো",
      "जूता", "जूते", "शूज", "स्नीकर", "स्नीकर्स", "फुटवियर",
      "காலணி", "ஷூ", "ஷூஸ்", "బూట్లు", "షూస్", "बूट", "शूज", "જોડા", "બૂટ",
      "ಶೂ", "ഷൂ", "ഷൂസ്", "ਜੁੱਤੇ", "ਜੁੱਤੀ",
    ],
  },
  {
    canonical: "sandals",
    synonyms: ["sandal", "sandals", "slipper", "slippers", "slide", "slides"],
    aliases: [
      "sandal", "sandals", "slipper", "slippers", "slide", "slides", "chappal", "choti",
      "স্যান্ডেল", "চটি", "স্লিপার", "চপ্পল",
      "चप्पल", "सैंडल", "स्लिपर", "स्लिपर्स", "स्लाइड्स",
    ],
  },
  {
    canonical: "saree",
    synonyms: ["saree", "sarees", "sari", "saris"],
    aliases: [
      "saree", "sarees", "sari", "saris", "shari", "sadi",
      "শাড়ি", "শাড়ি", "साड़ी", "साडी",
      "சேலை", "చీర", "साडी", "સાડી", "ಸೀರೆ", "സാരി", "ਸਾੜੀ",
    ],
  },
  {
    canonical: "kurti",
    synonyms: ["kurti", "kurtis", "anarkali"],
    aliases: [
      "kurti", "kurtis", "anarkali",
      "কুর্তি", "চুড়িদার", "আনারকলি",
      "कुर्ती", "कुर्तियां", "अनारकली", "सूट",
      "குர்த்தி", "కుర్తీ", "कुर्ती", "કુર્તી", "ಕುರ್ತಿ", "കുർത്തി", "ਕੁਰਤੀ",
    ],
  },
  {
    canonical: "kurta",
    synonyms: ["kurta", "kurtas", "pajama"],
    aliases: [
      "kurta", "kurtas", "panjabi", "punjabi",
      "কুর্তা", "পাঞ্জাবি", "পাঞ্জাবী",
      "कुर्ता", "कुर्ते", "कुर्ता पजामा",
    ],
  },
  {
    canonical: "bag",
    synonyms: ["bag", "bags", "tote", "handbag", "backpack"],
    aliases: [
      "bag", "bags", "tote", "tote bag", "handbag", "backpack", "purse",
      "ব্যাগ", "টোট ব্যাগ", "হ্যান্ডব্যাগ", "পার্স", "থলি",
      "बैग", "टोट बैग", "हैंडबैग", "पर्स", "बैकपैक",
      "பை", "பேக்", "బ్యాగ్", "बॅग", "બેગ", "ಬ್ಯಾಗ್", "ബാഗ്", "ਬੈਗ",
    ],
  },
  {
    canonical: "cap",
    synonyms: ["cap", "caps", "hat", "beanie"],
    aliases: [
      "cap", "caps", "hat", "tupi", "topi",
      "টুপি", "ক্যাপ", "टोपी", "कैप",
    ],
  },
  {
    canonical: "dress",
    synonyms: ["dress", "dresses", "gown", "one piece", "frock"],
    aliases: [
      "dress", "dresses", "gown", "one piece", "frock",
      "ড্রেস", "গাউন", "ফ্রক",
      "ड्रेस", "गाउन", "फ्रॉक", "वन पीस",
    ],
  },
  {
    canonical: "top",
    synonyms: ["top", "tops", "crop top", "tunic", "blouse"],
    aliases: [
      "top", "tops", "crop top", "tunic", "blouse",
      "টপ", "টপস", "ক্রপ টপ", "ব্লাউজ",
      "टॉप", "टॉप्स", "क्रॉप टॉप", "ब्लाउज",
    ],
  },
  {
    canonical: "jewellery",
    synonyms: ["jewellery", "jewelry", "earring", "earrings", "necklace", "bracelet", "ring", "bangle", "pendant", "jhumka"],
    aliases: [
      "jewellery", "jewelry", "earring", "earrings", "necklace", "bracelet", "bangle", "pendant", "jhumka", "jhumkas", "goyna", "gehna",
      "গয়না", "গহনা", "কানের দুল", "দুল", "নেকলেস", "হার", "চুড়ি", "ব্রেসলেট", "আংটি", "ঝুমকা",
      "ज्वेलरी", "गहने", "झुमका", "झुमके", "कान के झुमके", "नेकलेस", "हार", "चूड़ी", "ब्रेसलेट",
    ],
  },
  {
    canonical: "watch",
    synonyms: ["watch", "watches", "wristwatch", "timepiece"],
    aliases: [
      "watch", "watches", "ghori", "ghadi",
      "ঘড়ি", "হাতঘড়ি", "ওয়াচ",
      "घड़ी", "वॉच",
    ],
  },
  {
    canonical: "socks",
    synonyms: ["socks", "sock"],
    aliases: [
      "socks", "sock", "moja", "moze",
      "মোজা", "সক্স",
      "मोजे", "जुराब", "सॉक्स",
    ],
  },
  {
    canonical: "decor",
    synonyms: ["decor", "home decor", "wall art", "lamp", "candle", "vase", "showpiece", "cushion"],
    aliases: [
      "decor", "home decor", "wall art", "lamp", "candle", "vase", "showpiece", "cushion",
      "হোম ডেকর", "ঘর সাজানো", "ডেকর", "ল্যাম্প", "মোমবাতি",
      "होम डेकोर", "डेकोर", "सजावट", "लैंप",
    ],
  },
  {
    canonical: "gift",
    synonyms: ["gift", "gifts", "hamper", "combo", "personalised", "personalized", "custom", "customised", "customized"],
    aliases: [
      "gift", "gifts", "hamper", "personalised", "personalized", "custom", "customised", "customized", "upohar", "tohfa",
      "গিফট", "উপহার", "কাস্টম", "পার্সোনালাইজড",
      "गिफ्ट", "तोहफा", "कस्टम", "पर्सनलाइज्ड",
    ],
  },
  {
    canonical: "ethnic",
    synonyms: ["ethnic", "traditional", "festive", "lehenga", "dupatta", "salwar", "suit"],
    aliases: [
      "ethnic", "traditional", "festive", "lehenga", "dupatta", "salwar", "churidar",
      "এথনিক", "ট্রেডিশনাল", "উৎসবের", "পুজোর", "লেহেঙ্গা", "সালোয়ার", "দোপাট্টা",
      "एथनिक", "ट्रेडिशनल", "फेस्टिव", "लहंगा", "सलवार", "दुपट्टा",
    ],
  },

  // Audience / Gender
  {
    canonical: "men",
    synonyms: ["men", "mens", "man", "male", "boys", "unisex"],
    aliases: [
      "men", "mens", "man", "male", "boys", "boy",
      "cheleder", "purushder", "ladkon", "ladke", "mard",
      "ছেলেদের", "পুরুষদের", "পুরুষ", "ছেলেরা", "মেনস", "মেন",
      "लड़कों", "पुरुषों", "आदमी", "मेन्स", "मेन", "जेंट्स",
      "ஆண்கள்", "పురుషుల", "पुरुषांचे", "मुलांचे", "પુરુષો", "ಪುರುಷರ", "പുരുഷന്മാരുടെ", "ਮਰਦਾਂ",
    ],
  },
  {
    canonical: "women",
    synonyms: ["women", "womens", "woman", "female", "ladies", "girls"],
    aliases: [
      "women", "womens", "woman", "female", "ladies", "girls", "girl",
      "meyeder", "mahilader", "mahila", "ladkiyon", "ladki",
      "মেয়েদের", "মহিলাদের", "মহিলা", "নারী", "লেডিস", "উইমেন",
      "लड़कियों", "महिलाओं", "लेडीज", "विमेन", "औरतों",
      "பெண்கள்", "మహిళల", "महिलांचे", "मुलींचे", "મહિલા", "ಮಹಿಳೆಯರ", "സ്ത്രീകളുടെ", "ਔਰਤਾਂ",
    ],
  },
  {
    canonical: "kids",
    synonyms: ["kids", "kid", "child", "children", "baby"],
    aliases: [
      "kids", "kid", "child", "children", "baby", "bachcha", "baccho",
      "বাচ্চাদের", "বাচ্চা", "শিশু", "बच्चों", "किड्स",
    ],
  },

  // Materials / Occasion / Features
  {
    canonical: "cotton",
    synonyms: ["cotton", "supima", "combed cotton"],
    aliases: [
      "cotton", "supima", "suti", "tula",
      "সুতি", "কটন", "सूती", "कॉटन",
    ],
  },
  {
    canonical: "silk",
    synonyms: ["silk"],
    aliases: ["silk", "resham", "রেশম", "সিল্ক", "सिल्क", "रेशम"],
  },
  {
    canonical: "printed",
    synonyms: ["printed", "print", "graphic"],
    aliases: [
      "printed", "print", "graphic",
      "প্রিন্টেড", "প্রিন্ট", "গ্রাফিক", "প্রিন্টের",
      "प्रिंटेड", "प्रिंट", "ग्राफिक",
    ],
  },
  {
    canonical: "plain",
    synonyms: ["plain", "solid", "basic", "minimal"],
    aliases: ["plain", "solid", "basic", "প্লেইন", "সলিড", "प्लेन", "सॉलिड"],
  },
  {
    canonical: "casual",
    synonyms: ["casual", "streetwear", "daily", "everyday"],
    aliases: ["casual", "streetwear", "ক্যাজুয়াল", "স্ট্রিটওয়্যার", "कैजुअल", "स्ट्रीटवियर"],
  },
  {
    canonical: "formal",
    synonyms: ["formal", "office"],
    aliases: ["formal", "office", "ফর্মাল", "অফিস", "फॉर्मल", "ऑफिस"],
  },
  {
    canonical: "winter",
    synonyms: ["winter", "heavyweight", "fleece", "warm"],
    aliases: ["winter", "fleece", "warm", "শীতের", "গরম", "सर्दियों", "गर्म", "विंटर"],
  },
  {
    canonical: "summer",
    synonyms: ["summer", "breathable", "lightweight"],
    aliases: ["summer", "গরমের", "गर्मियों", "समर"],
  },
  {
    canonical: "college",
    synonyms: ["college", "campus", "streetwear", "oversized", "casual", "trendy"],
    aliases: ["college", "campus", "কলেজ", "কলেজের", "कॉलेज", "कैंपस"],
  },
  {
    canonical: "party",
    synonyms: ["party", "evening", "date", "wedding", "festive"],
    aliases: ["party", "wedding", "biye", "shaadi", "পার্টি", "বিয়ে", "বিয়ের", "पार्टी", "शादी"],
  },
];

// Spoken helper / conversational filler words across Indian languages to strip before search
const STOP_WORDS = new Set([
  // English
  "show", "me", "find", "search", "looking", "for", "want", "need", "buy", "get", "give",
  "please", "pls", "some", "any", "the", "a", "an", "of", "in", "on", "to", "with", "and",
  "or", "best", "good", "nice", "cheap", "cheapest", "affordable", "latest", "new", "top",
  "rated", "popular", "trending", "bestseller", "bestsellers", "suggest", "suggestion", "recommend",
  "items", "item", "product", "products", "clothes", "clothing", "wear", "zebalpha", "alpha",
  "under", "below", "less", "than", "within", "upto", "up", "max", "price", "budget", "rs", "inr", "rupees",
  // Bengali & Banglish
  "দেখাও", "দেখান", "দাও", "দিন", "খোঁজো", "খুঁজে", "খুজুন", "চাই", "লাগবে", "দরকার", "বলো", "বলুন", "করো",
  "আছে", "নাকি", "কি", "কী", "একটা", "একটি", "কিছু", "আমার", "জন্য", "ভালো", "ভাল", "সেরা", "সুন্দর",
  "কম", "দাম", "দামে", "দামের", "সস্তা", "এর", "মধ্যে", "ভিতরে", "ভেতরে", "নিচে", "নীচে", "তলায়",
  "টাকার", "টাকা", "রুপি", "সব", "নতুন", "দেখতে", "কিনতে", "রেটেড", "বেস্ট",
  "dekhao", "dakhao", "dekhau", "dekhun", "dekhabe", "dao", "din", "khojo", "khujo", "chai", "lagbe", "dorkar",
  "ache", "achhe", "naki", "ki", "ekta", "ekti", "kichu", "amar", "jonno", "jonyo", "bhalo", "valo", "sera", "sundor",
  "kom", "dam", "dame", "damer", "sasta", "shosta", "er", "r", "moddhe", "modhe", "vitore", "bhitore", "niche", "takar", "taka", "koro", "bolo",
  // Hindi & Hinglish
  "दिखाओ", "दिखाइए", "दिखाना", "चाहिए", "दो", "दीजिए", "खोजो", "ढूंढो", "बताना", "बताओ", "करो",
  "सस्ता", "सस्ते", "अच्छा", "अच्छे", "अच्छी", "बढ़िया", "बेस्ट", "नया", "नये", "नई", "टॉप",
  "के", "लिए", "में", "का", "की", "को", "से", "पर", "और", "या", "एक", "कोई", "कुछ", "है", "हैं", "क्या",
  "वाला", "वाले", "वाली", "नीचे", "तक", "अंदर", "कम", "रुपये", "रुपए", "रुपया", "पैसे", "बजट",
  "dikhao", "dikhaiye", "dikha", "chahiye", "chahie", "do", "dijiye", "khojo", "dhundo", "batao", "karo",
  "sasta", "saste", "accha", "achha", "achhe", "achhi", "badiya", "badhiya", "naya", "naye", "ke", "k", "liye", "wala", "wali", "wale",
  "andar", "niche", "tak", "mein", "me", "rupaye", "rupees", "paisa", "hai", "kya", "koi", "kuch", "mera", "mere",
  // Marathi / Tamil / Telugu / Gujarati / Kannada / Malayalam / Punjabi fillers
  "दाखवा", "पाहिजे", "सांगा", "स्वस्त", "चांगले",
  "காட்டு", "வேண்டும்", "குறைந்த", "நல்ல",
  "చూపించు", "కావాలి", "మంచి", "తక్కువ",
  "બતાવો", "જોઈએ", "સસ્તું", "સારું",
  "ತೋರಿಸಿ", "ಬೇಕು", "ಒಳ್ಳೆಯ", "ಕಡಿಮೆ",
  "കാണിക്കുക", "വേണം", "നല്ല", "കുറഞ്ഞ",
  "ਦਿਖਾਓ", "ਚਾਹੀਦਾ", "ਵਧੀਆ", "ਸਸਤਾ",
]);

const DIGIT_MAP: Record<string, string> = {
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4", "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
  "०": "0", "१": "1", "२": "2", "३": "3", "४": "4", "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
  "૦": "0", "૧": "1", "૨": "2", "૩": "3", "૪": "4", "૫": "5", "૬": "6", "૭": "7", "૮": "8", "૯": "9",
  "௦": "0", "௧": "1", "௨": "2", "௩": "3", "௪": "4", "௫": "5", "௬": "6", "௭": "7", "௮": "8", "௯": "9",
  "౦": "0", "౧": "1", "౨": "2", "౩": "3", "౪": "4", "౫": "5", "౬": "6", "౭": "7", "౮": "8", "౯": "9",
  "೦": "0", "೧": "1", "೨": "2", "೩": "3", "೪": "4", "೫": "5", "೬": "6", "೭": "7", "೮": "8", "೯": "9",
  "൦": "0", "൧": "1", "൨": "2", "൩": "3", "൪": "4", "൫": "5", "൬": "6", "൭": "7", "൮": "8", "൯": "9",
  "੦": "0", "੧": "1", "੨": "2", "੩": "3", "੪": "4", "੫": "5", "੬": "6", "੭": "7", "੮": "8", "੯": "9",
};

const SPOKEN_PRICE_PHRASES: Array<[RegExp, string]> = [
  [/পাঁচশো|পাঁচশ|पांच सौ|पांचसो|five hundred/gi, "500"],
  [/হাজার|এক হাজার|एक हजार|one thousand/gi, "1000"],
  [/আড়াইশো|ढाई सौ/gi, "250"],
  [/তিনশো|तीन सौ|three hundred/gi, "300"],
  [/চারশো|चार सौ|four hundred/gi, "400"],
  [/ছয়শো|ছশো|छह सौ|six hundred/gi, "600"],
  [/সাতশো|सात सौ|seven hundred/gi, "700"],
  [/আটশো|आठ सौ|eight hundred/gi, "800"],
  [/নয়শো|নশো|नौ सौ|nine hundred/gi, "900"],
  [/দুই হাজার|দু হাজার|दो हजार|two thousand/gi, "2000"],
];

// Build longest-first phrase index for deterministic multi-word matching
interface AliasEntry {
  alias: string;
  concept: ConceptDef;
}

const ALIAS_ENTRIES: AliasEntry[] = [];
for (const concept of MULTILINGUAL_CONCEPTS) {
  for (const alias of concept.aliases) {
    ALIAS_ENTRIES.push({ alias: alias.toLowerCase(), concept });
  }
}
ALIAS_ENTRIES.sort((a, b) => b.alias.length - a.alias.length);

const SINGLE_TOKEN_MAP = new Map<string, ConceptDef>();
for (const entry of ALIAS_ENTRIES) {
  if (!entry.alias.includes(" ") && !SINGLE_TOKEN_MAP.has(entry.alias)) {
    SINGLE_TOKEN_MAP.set(entry.alias, entry.concept);
  }
}
const PHRASE_ENTRIES = ALIAS_ENTRIES.filter((e) => e.alias.includes(" "));

export function normalizeLocalizedDigits(input: string): string {
  let out = input;
  for (const [nativeDigit, asciiDigit] of Object.entries(DIGIT_MAP)) {
    if (out.includes(nativeDigit)) {
      out = out.split(nativeDigit).join(asciiDigit);
    }
  }
  return out;
}

export function sanitizePostgrestPattern(term: string): string {
  return term
    .replace(/[%*,()\\"'`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface ParsedSearchQuery {
  rawQuery: string;
  normalizedInput: string;
  translatedQuery: string;
  concepts: string[][];
  flatTerms: string[];
  maxPrice: number | null;
  wasTranslated: boolean;
  hasUntranslatedNonAscii: boolean;
}

export function parseMultilingualSearchQuery(
  rawQuery: string,
  extraEnglishHint?: string | null
): ParsedSearchQuery {
  const combinedSource = [rawQuery, extraEnglishHint].filter(Boolean).join(" ").trim();
  const raw = rawQuery.trim();
  if (!combinedSource) {
    return {
      rawQuery: raw,
      normalizedInput: "",
      translatedQuery: "",
      concepts: [],
      flatTerms: [],
      maxPrice: null,
      wasTranslated: false,
      hasUntranslatedNonAscii: false,
    };
  }

  let normalized = normalizeLocalizedDigits(combinedSource).toLowerCase();
  for (const [pattern, numStr] of SPOKEN_PRICE_PHRASES) {
    normalized = normalized.replace(pattern, ` ${numStr} `);
  }

  // Extract budget cap phrases across English, Bengali, Banglish, Hindi & Hinglish
  // e.g. "under 500", "500 টাকার মধ্যে", "500 takar moddhe", "500 ke andar", "500 रुपये में"
  let maxPrice: number | null = null;
  const budgetBefore = normalized.match(
    /(?:under|below|less\s+than|within|upto|up\s+to|max|budget|কম|নিচে|নীচে|মধ্যে|ভেতরে|ভিতরে|नीचे|तक|अंदर)\s*(?:rs\.?|inr|₹|টাকা|টাকার|taka|takar|रुपये|रुपए|rupaye|rupees)?\s*(\d{2,5})/i
  );
  const budgetAfter = normalized.match(
    /(?:rs\.?|inr|₹)?\s*(\d{2,5})\s*(?:টাকার\s*(?:নিচে|নীচে|মধ্যে|ভেতরে|ভিতরে)|টাকা\s*(?:নিচে|নীচে|মধ্যে|ভেতরে|ভিতরে)|takar\s*(?:niche|moddhe|modhe|vitore|bhitore)|taka\s*(?:niche|moddhe|modhe|vitore|bhitore)|(?:er|r)\s*(?:niche|moddhe|modhe|vitore|bhitore)|(?:रुपये|रुपए|रुपया|rupaye|rupees|rs\.?)?\s*(?:के\s*)?(?:नीचे|अंदर|तक|में)|(?:ke|k)\s*(?:andar|niche|under|tak)|mein|me|tak)(?=$|[\s,।.?!])/i
  );
  const matchedBudget = budgetBefore?.[1] || budgetAfter?.[1];
  if (matchedBudget) {
    const parsedNum = Number(matchedBudget);
    if (Number.isFinite(parsedNum) && parsedNum >= 50 && parsedNum <= 50000) {
      maxPrice = parsedNum;
      normalized = normalized.replace(budgetBefore?.[0] || budgetAfter?.[0] || "", " ");
    }
  }

  // Strip punctuation while preserving Unicode letters/digits and spaces
  let cleanText = normalized
    .replace(/[।|?!,;:/"'`~@#$%^&*()_+=\[\]{}<>]+/g, " ")
    .replace(/\s-\s/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const conceptsMap = new Map<string, string[]>();
  const canonicalOrder: string[] = [];
  let wasTranslated = false;

  const addConcept = (canonical: string, synonyms: string[], isTranslatedHit: boolean) => {
    if (!conceptsMap.has(canonical)) {
      conceptsMap.set(canonical, [...synonyms]);
      canonicalOrder.push(canonical);
    }
    if (isTranslatedHit) {
      wasTranslated = true;
    }
  };

  // 1. Multi-word phrase matches (longest first)
  for (const { alias, concept } of PHRASE_ENTRIES) {
    const padded = ` ${cleanText} `;
    if (padded.includes(` ${alias} `)) {
      const isNonAsciiOrRegional = /[^\x00-\x7F]/.test(alias) || alias !== concept.canonical;
      addConcept(concept.canonical, concept.synonyms, isNonAsciiOrRegional);
      cleanText = padded.split(` ${alias} `).join(" ").replace(/\s+/g, " ").trim();
    }
  }

  // 2. Single-token matching
  const remainingWords = cleanText.split(/\s+/).filter(Boolean);
  let hasUntranslatedNonAscii = false;

  for (const token of remainingWords) {
    const trimmed = token.replace(/^-+|-+$/g, "");
    if (!trimmed) continue;

    // Strip common Bengali/Hindi/English inflections for stem lookup
    const candidates = [trimmed];
    if (trimmed.length > 3) {
      if (/[^\x00-\x7F]/.test(trimmed)) {
        candidates.push(trimmed.replace(/(গুলো|গুলি|টার|টির|ের|এর|টা|টি|রা|ओं|ों|यां|िया|े)$/u, ""));
      } else {
        candidates.push(trimmed.replace(/(er|der|ke|ra|s|es)$/i, ""));
      }
    }

    let matchedConcept: ConceptDef | undefined;
    for (const candidate of candidates) {
      if (!candidate) continue;
      matchedConcept = SINGLE_TOKEN_MAP.get(candidate);
      if (matchedConcept) break;
    }

    if (matchedConcept) {
      const isNonAsciiOrRegional =
        /[^\x00-\x7F]/.test(trimmed) || trimmed !== matchedConcept.canonical;
      addConcept(matchedConcept.canonical, matchedConcept.synonyms, isNonAsciiOrRegional);
      continue;
    }

    if (STOP_WORDS.has(trimmed)) {
      continue;
    }

    // Pure numeric non-budget numbers < 50 might be sizes (28, 30, 32, 40)
    if (/^\d+$/.test(trimmed)) {
      const numVal = Number(trimmed);
      if (numVal > 48 && maxPrice === null) {
        continue;
      }
      addConcept(trimmed, [trimmed], false);
      continue;
    }

    if (/[^\x00-\x7F]/.test(trimmed)) {
      hasUntranslatedNonAscii = true;
    }

    if (trimmed.length >= 2) {
      const syns = trimmed.endsWith("s") && trimmed.length >= 4
        ? [trimmed, trimmed.slice(0, -1)]
        : [trimmed];
      addConcept(trimmed, syns, false);
    }
  }

  const concepts = canonicalOrder.map((k) => conceptsMap.get(k) || [k]);
  const flatTerms = Array.from(new Set(concepts.flat()));
  const translatedQuery = canonicalOrder.join(" ").trim();

  return {
    rawQuery: raw,
    normalizedInput: normalized,
    translatedQuery: translatedQuery || raw,
    concepts,
    flatTerms,
    maxPrice,
    wasTranslated,
    hasUntranslatedNonAscii,
  };
}

/**
 * Builds a safe PostgREST `.or(...)` clause for a single concept's synonym list
 * matching against name, description, brand, or collection.
 */
export function buildConceptOrClause(synonyms: string[]): string {
  const clauses: string[] = [];
  const seen = new Set<string>();

  for (const rawTerm of synonyms.slice(0, 8)) {
    const safe = sanitizePostgrestPattern(rawTerm);
    if (!safe || safe.length < 2 || seen.has(safe)) continue;
    seen.add(safe);
    clauses.push(
      `name.ilike.%${safe}%`,
      `description.ilike.%${safe}%`,
      `brand.ilike.%${safe}%`,
      `collection.ilike.%${safe}%`
    );
  }

  return clauses.join(",");
}

/**
 * Applies structured multilingual search constraints to a Supabase/PostgREST query builder.
 * - "and": Every extracted concept (e.g. color AND garment) must match, plus spoken maxPrice if present.
 * - "or": Broadened fallback matching any concept synonym so partial attribute mismatches still return results.
 */
export function applyMultilingualSearchConstraints<
  TQuery extends {
    or: (filters: string) => TQuery;
    lte: (column: string, value: number) => TQuery;
  }
>(
  query: TQuery,
  parsed: ParsedSearchQuery,
  mode: "and" | "or" = "and",
  existingMaxPrice?: number | null
): TQuery {
  let nextQuery = query;

  if (parsed.concepts.length === 0) {
    const safeRaw = sanitizePostgrestPattern(parsed.rawQuery);
    if (safeRaw.length >= 2) {
      const clause = buildConceptOrClause([safeRaw]);
      if (clause) nextQuery = nextQuery.or(clause);
    }
    return nextQuery;
  }

  if (mode === "and") {
    for (const conceptSyns of parsed.concepts.slice(0, 4)) {
      const clause = buildConceptOrClause(conceptSyns);
      if (clause) {
        nextQuery = nextQuery.or(clause);
      }
    }
  } else {
    // Broadened OR across the non-generic concepts first, fallback to flatTerms
    const mergedClause = buildConceptOrClause(parsed.flatTerms.slice(0, 12));
    if (mergedClause) {
      nextQuery = nextQuery.or(mergedClause);
    }
  }

  if (
    parsed.maxPrice !== null &&
    (existingMaxPrice === undefined || existingMaxPrice === null || isNaN(existingMaxPrice))
  ) {
    nextQuery = nextQuery.lte("price", parsed.maxPrice);
  }

  return nextQuery;
}

/**
 * Scores and ranks products returned from a search query so multi-concept matches
 * and title hits always surface first.
 */
export function rankProductsByQueryConcepts<
  T extends { name?: string | null; description?: string | null; brand?: string | null; collection?: string | null }
>(items: T[], parsed: ParsedSearchQuery): T[] {
  if (!Array.isArray(items) || items.length <= 1 || parsed.concepts.length === 0) {
    return items;
  }

  const translatedLower = parsed.translatedQuery.toLowerCase();

  return [...items]
    .map((item, idx) => {
      const name = String(item.name || "").toLowerCase();
      const brand = String(item.brand || "").toLowerCase();
      const collection = String(item.collection || "").toLowerCase();
      const desc = String(item.description || "").toLowerCase();

      let score = 0;
      if (translatedLower && name.includes(translatedLower)) {
        score += 40;
      }

      for (const synonyms of parsed.concepts) {
        let matchedInTitle = false;
        let matchedAnywhere = false;
        for (const syn of synonyms) {
          const s = syn.toLowerCase();
          if (name.includes(s)) {
            matchedInTitle = true;
            matchedAnywhere = true;
            break;
          }
          if (brand.includes(s) || collection.includes(s)) {
            matchedAnywhere = true;
          } else if (desc.includes(s)) {
            matchedAnywhere = true;
          }
        }
        if (matchedInTitle) score += 15;
        else if (matchedAnywhere) score += 6;
      }

      return { item, score, idx };
    })
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.idx - b.idx))
    .map((entry) => entry.item);
}

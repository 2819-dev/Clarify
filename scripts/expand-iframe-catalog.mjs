/**
 * Add curated Jewish + Family-Friendly channels (real @handles) and pull
 * many more iframe-verified (oEmbed OK) uploads into Neon.
 *
 * Prefer thin/empty existing channels, then new curated handles.
 * Usage: node scripts/expand-iframe-catalog.mjs
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envText = readFileSync(resolve(root, ".env.local"), "utf8");
const databaseUrl =
  process.env.DATABASE_URL ||
  envText.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL required");
const sql = neon(databaseUrl);

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

/** New channels to add if missing: [handleWithoutAt, isJewish, categoryHint] */
const NEW_CHANNELS = [
  // Jewish / heritage / learning / music
  ["sefaria", true, "torah"],
  ["standwithus", true, "community"],
  ["yadvashem", true, "history"],
  ["ushmm", true, "history"],
  ["jewbelong", true, "community"],
  ["torahanytime", true, "torah"],
  ["orthodoxunion", true, "community"],
  ["yeshivauniversity", true, "learning"],
  ["bennyfriedmanmusic", true, "music"],
  ["gadelbaz", true, "music"],
  ["jewishagency", true, "community"],
  ["museumofjewishheritage", true, "history"],
  ["tabletmag", true, "community"],
  ["forward", true, "community"],
  ["hadassah", true, "community"],
  ["jnfusa", true, "community"],
  ["livinglashon", true, "hebrew"],
  ["hebrewwithhila", true, "hebrew"],
  ["koshercom", true, "cooking"],
  ["jewishlearninginstitute", true, "torah"],
  ["alephbeta", true, "torah"],
  ["jewishtv", true, "family"],
  ["israelwithilan", true, "community"],
  ["travelisrael", true, "community"],
  ["jewishkids", true, "learning"],
  ["shirarinasings", true, "music"],
  ["yaakovshwekey", true, "music"],
  ["avrahamfried", true, "music"],
  ["8thdayband", true, "music"],
  ["zusha", true, "music"],
  ["matisyaahu", true, "music"],
  ["thejewishchannel", true, "community"],
  ["jewishaction", true, "community"],
  ["chabadoncampus", true, "community"],
  ["moishiehellman", true, "music"],
  ["berelweiss", true, "music"],
  ["Jacobsyechiel", true, "comedy"],
  // Family-friendly
  ["storybots", false, "learning"],
  ["thedadlab", false, "science"],
  ["teded", false, "learning"],
  ["kurzgesagt", false, "science"],
  ["mothergooseclub", false, "music"],
  ["peekabookidz", false, "learning"],
  ["smileandlearn", false, "learning"],
  ["sandiegozoo", false, "nature"],
  ["montereybayaquarium", false, "nature"],
  ["smithsonianchannel", false, "history"],
  ["amnhorg", false, "science"],
  ["codeorg", false, "learning"],
  ["busybeavers", false, "music"],
  ["chuchutv", false, "music"],
  ["littlebabybum", false, "music"],
  ["generationgenius", false, "science"],
  ["smartereveryday", false, "science"],
  ["howitsmadeofficial", false, "science"],
  ["nationalgeographic", false, "nature"],
  ["bbcearth", false, "nature"],
  ["crashcourse", false, "learning"],
  ["scishow", false, "science"],
  ["minutephysics", false, "science"],
  ["numberphile", false, "science"],
  ["veritasium", false, "science"],
  ["markrober", false, "science"],
  ["guinnessworldrecords", false, "family"],
  ["animalplanet", false, "nature"],
  ["artforkidshub", false, "crafts"],
  ["drawingwithmichael", false, "crafts"],
  ["simplehistory", false, "history"],
  ["oversimplified", false, "history"],
  ["odditysshorts", false, "family"],
  ["kidslearningtube", false, "learning"],
  ["freeschool", false, "learning"],
  ["happylearningenglish", false, "learning"],
  ["twinkl", false, "learning"],
  ["oxfordowl", false, "learning"],
  ["britmuseum", false, "history"],
  ["smithsonian", false, "history"],
  ["nasa", false, "science"],
  ["esa", false, "science"],
  // Round 2 — more Jewish
  ["ushmmorg", true, "history"],
  ["holocaustmuseum", true, "history"],
  ["jewishmuseum", true, "history"],
  ["thejewishmuseum", true, "history"],
  ["skirball", true, "community"],
  ["skirballculturalcenter", true, "community"],
  ["ajcglobal", true, "community"],
  ["adl", true, "community"],
  ["adl_national", true, "community"],
  ["jewishfederations", true, "community"],
  ["jewishfederationsofna", true, "community"],
  ["hjf", true, "community"],
  ["wjcongress", true, "community"],
  ["worldjewishcongress", true, "community"],
  ["israel21c", true, "community"],
  ["idf", true, "community"],
  ["idfonline", true, "community"],
  ["jerusalemu", true, "learning"],
  ["openu", true, "learning"],
  ["technion", true, "science"],
  ["weizmanninstitute", true, "science"],
  ["hebrewu", true, "learning"],
  ["huji", true, "learning"],
  ["telavivuniversity", true, "learning"],
  ["barilanuniversity", true, "learning"],
  ["oukosher", true, "cooking"],
  ["kosherdotcom", true, "cooking"],
  ["jamiegeller", true, "cooking"],
  ["leahcookskosher", true, "cooking"],
  ["naomihadra", true, "cooking"],
  ["mayim", true, "community"],
  ["mayimbialik", true, "community"],
  ["bennyfriedman", true, "music"],
  ["yaakovshwekeyofficial", true, "music"],
  ["mordechaishapiro", true, "music"],
  ["ishayribo", true, "music"],
  ["oshrikohli", true, "music"],
  ["hatikvahmusic", true, "music"],
  ["jewishacappella", true, "music"],
  ["six13sings", true, "music"],
  ["themaccabeats", true, "music"],
  ["maccabeats", true, "music"],
  ["bimbam", true, "learning"],
  ["unpacked", true, "learning"],
  ["jewishunpacked", true, "learning"],
  ["pragerukids", true, "learning"],
  ["prageru", true, "learning"],
  ["alephbetaacademy", true, "torah"],
  ["hidabroot", true, "torah"],
  ["hidabrootcom", true, "torah"],
  ["aish", true, "torah"],
  ["aishcom", true, "torah"],
  ["aish-studios", true, "torah"],
  ["chabadorg", true, "torah"],
  ["chabadkidsvideos", true, "learning"],
  ["jewishkidsfavorites", true, "learning"],
  ["shalomsesame", true, "learning"],
  ["pjlibraryofficial", true, "learning"],
  ["myjewishlearning", true, "learning"],
  ["sefariaproject", true, "torah"],
  ["opensiddur", true, "prayer"],
  ["openjudaism", true, "torah"],
  ["reformjudaism", true, "community"],
  ["reconstructingjudaism", true, "community"],
  ["uscj", true, "community"],
  ["rabbinicalassembly", true, "community"],
  ["moishie", true, "music"],
  ["eliav", true, "music"],
  ["shwekey", true, "music"],
  ["lipa", true, "music"],
  ["lipaschmeltzer", true, "music"],
  ["beriberi", true, "music"],
  ["dovestar", true, "music"],
  ["jewishmusiccentral", true, "music"],
  ["jewtunes", true, "music"],
  ["kosherock", true, "music"],
  ["shalshelet", true, "music"],
  ["neshomah", true, "music"],
  ["ruach", true, "music"],
  ["ruachband", true, "music"],
  ["bluefringemusic", true, "music"],
  ["thejewishstar", true, "community"],
  ["jewishtimes", true, "community"],
  ["jtaorg", true, "community"],
  ["jewishtelegraphicagency", true, "community"],
  // Round 2 — more family-friendly
  ["sesamestreet", false, "learning"],
  ["pbskids", false, "learning"],
  ["pbs", false, "learning"],
  ["cbeebies", false, "learning"],
  ["bbclearning", false, "learning"],
  ["bbcbitesize", false, "learning"],
  ["khanacademy", false, "learning"],
  ["khanacademykids", false, "learning"],
  ["duolingo", false, "learning"],
  ["scratchteam", false, "learning"],
  ["cs50", false, "learning"],
  ["mitocw", false, "learning"],
  ["stanfordonline", false, "learning"],
  ["googleforkids", false, "learning"],
  ["youtubelearning", false, "learning"],
  ["ted", false, "learning"],
  ["tedxkids", false, "learning"],
  ["nationalgeographic", false, "nature"],
  ["natgeokids", false, "nature"],
  ["natgeoanimals", false, "nature"],
  ["bbcearth", false, "nature"],
  ["bbcearthkids", false, "nature"],
  ["discoverykids", false, "nature"],
  ["disneynature", false, "nature"],
  ["wildkratts", false, "nature"],
  ["octonauts", false, "nature"],
  ["peppa", false, "family"],
  ["peppapig", false, "family"],
  ["bluyclues", false, "learning"],
  ["blueyofficial", false, "family"],
  ["danieltiger", false, "learning"],
  ["misterrogers", false, "learning"],
  ["readingrainbow", false, "learning"],
  ["storylineonline", false, "learning"],
  ["vooks", false, "stories"],
  ["brightlystorytime", false, "stories"],
  ["kidstimesstories", false, "stories"],
  ["cosmickids", false, "sports"],
  ["cosmickidsyoga", false, "sports"],
  ["gonoodle", false, "sports"],
  ["justdancekids", false, "sports"],
  ["nikekids", false, "sports"],
  ["olympics", false, "sports"],
  ["paralympics", false, "sports"],
  ["fifakids", false, "sports"],
  ["nba", false, "sports"],
  ["lego", false, "gaming"],
  ["legofriends", false, "gaming"],
  ["minecraft", false, "gaming"],
  ["minecraftofficial", false, "gaming"],
  ["roblox", false, "gaming"],
  ["nintendo", false, "gaming"],
  ["nintendokids", false, "gaming"],
  ["playstation", false, "gaming"],
  ["xbox", false, "gaming"],
  ["epicgames", false, "gaming"],
  ["howitsmade", false, "science"],
  ["sciencechannel", false, "science"],
  ["nasaarmstrong", false, "science"],
  ["nasajpl", false, "science"],
  ["esaops", false, "science"],
  ["spacex", false, "science"],
  ["blueorigin", false, "science"],
  ["smithsonianzoo", false, "nature"],
  ["bronxzoo", false, "nature"],
  ["brookfieldzoo", false, "nature"],
  ["georgiaaquarium", false, "nature"],
  ["sheddaquarium", false, "nature"],
  ["montereybay", false, "nature"],
  ["newenglandaquarium", false, "nature"],
  ["vancouveraquarium", false, "nature"],
  ["torontozoo", false, "nature"],
  ["londonzoo", false, "nature"],
  ["edinburghzoo", false, "nature"],
  ["sanfranciscozoo", false, "nature"],
  ["artforkids", false, "crafts"],
  ["artforkidshub", false, "crafts"],
  ["moriahkathryn", false, "crafts"],
  ["theartofeducation", false, "crafts"],
  ["origami", false, "crafts"],
  ["easypeasyandfun", false, "crafts"],
  ["redtedart", false, "crafts"],
  ["babyshark", false, "music"],
  ["pinkfong", false, "music"],
  ["cocomelon", false, "music"],
  ["supersimplesongs", false, "music"],
  ["mothergooseclubplayhouse", false, "music"],
  ["littleangel", false, "music"],
  ["chuchutv", false, "music"],
  ["infobells", false, "music"],
  ["farfaria", false, "stories"],
  ["abcmouse", false, "learning"],
  ["hookedonphonics", false, "learning"],
  ["starfall", false, "learning"],
  ["brainpop", false, "learning"],
  ["brainpopjr", false, "learning"],
  ["mysteryscience", false, "science"],
  ["generationgeniusstem", false, "science"],
  ["sciencemax", false, "science"],
  ["sickscience", false, "science"],
  ["nilered", false, "science"],
  ["thebrainscoop", false, "science"],
  ["asimplescientist", false, "science"],
  ["physicsgirl", false, "science"],
  ["minuteearth", false, "science"],
  ["tededstudents", false, "learning"],
  ["crashcoursekids", false, "learning"],
  ["scishowkids", false, "science"],
  ["scishowspace", false, "science"],
  ["itsokaytobesmart", false, "science"],
  ["asapcience", false, "science"],
  ["domainofscience", false, "science"],
  ["numberblocks", false, "learning"],
  ["alphablocks", false, "learning"],
  ["colourblocks", false, "learning"],
  ["learningblocks", false, "learning"],
  ["wondergrove", false, "learning"],
  ["highlightskids", false, "learning"],
  ["nationalgeographicedu", false, "learning"],
  ["scholastic", false, "learning"],
  ["scholasticparents", false, "learning"],
  ["readacrossamerica", false, "stories"],
  // Round 3 — more Jewish
  ["jewsforjudaism", true, "torah"],
  ["partnersinjudaism", true, "torah"],
  ["simpletoremember", true, "torah"],
  ["torahcafe", true, "torah"],
  ["torahanytimeofficial", true, "torah"],
  ["oupress", true, "torah"],
  ["oukosherorg", true, "cooking"],
  ["koshercomvideos", true, "cooking"],
  ["kosheronthemove", true, "cooking"],
  ["busyinjthekitchen", true, "cooking"],
  ["betweencarpools", true, "cooking"],
  ["koshercowboy", true, "cooking"],
  ["jewlishkitchen", true, "cooking"],
  ["jewishfoodexperience", true, "cooking"],
  ["tabletmagvideo", true, "community"],
  ["momentmagazine", true, "community"],
  ["jewishcurrents", true, "community"],
  ["kveller", true, "community"],
  ["heyalma", true, "community"],
  ["18doors", true, "community"],
  ["hillelinternational", true, "community"],
  ["hillel", true, "community"],
  ["moishheilman", true, "music"],
  ["eliavzohar", true, "music"],
  ["shwekeyofficial", true, "music"],
  ["avrahamfriedofficial", true, "music"],
  ["yaakovshwekeymusic", true, "music"],
  ["gadelbazofficial", true, "music"],
  ["ishayriboofficial", true, "music"],
  ["oshri", true, "music"],
  ["hatikva", true, "music"],
  ["bluefringe", true, "music"],
  ["jewishrockradio", true, "music"],
  ["jewishacappella", true, "music"],
  ["kolbo", true, "music"],
  ["neshama", true, "music"],
  ["ruachrevival", true, "music"],
  ["shira", true, "music"],
  ["shirachadasha", true, "music"],
  ["jewishkidsnetwork", true, "learning"],
  ["torahforkids", true, "learning"],
  ["hebrewforkids", true, "hebrew"],
  ["hebrewpod101", true, "hebrew"],
  ["learnhebrew", true, "hebrew"],
  ["ulpan", true, "hebrew"],
  ["ulpanor", true, "hebrew"],
  ["teachmehebrew", true, "hebrew"],
  ["israelforever", true, "community"],
  ["standwithusofficial", true, "community"],
  ["cameraorg", true, "community"],
  ["honestreporting", true, "community"],
  ["memri", true, "community"],
  ["memritv", true, "community"],
  ["jewishvirtuallibrary", true, "history"],
  ["yivoinstitute", true, "history"],
  ["yivo", true, "history"],
  ["cjhnyc", true, "history"],
  ["centerforjewishhistory", true, "history"],
  ["ushmmofficial", true, "history"],
  ["holocaustencyclopedia", true, "history"],
  ["yadvashemofficial", true, "history"],
  ["annefrankhouse", true, "history"],
  ["annefrank", true, "history"],
  ["museumoftolerance", true, "history"],
  ["simonswiesenthal", true, "history"],
  ["wiesenthalcenter", true, "history"],
  ["jewishbookcouncil", true, "stories"],
  ["pjlibrary", true, "stories"],
  ["karben", true, "stories"],
  ["behrmanhouse", true, "learning"],
  ["behrman", true, "learning"],
  ["torahaura", true, "learning"],
  ["lookstein", true, "learning"],
  ["looksteincenter", true, "learning"],
  ["pardes", true, "torah"],
  ["pardesinstitute", true, "torah"],
  ["hartmaninstitute", true, "torah"],
  ["shalomhartman", true, "torah"],
  ["mechonhadar", true, "torah"],
  ["hadar", true, "torah"],
  ["drisha", true, "torah"],
  ["yct", true, "torah"],
  ["yctharova", true, "torah"],
  ["riets", true, "torah"],
  ["yuutorah", true, "torah"],
  ["yuitorah", true, "torah"],
  ["matanel", true, "community"],
  ["israelfund", true, "community"],
  ["friendsofidf", true, "community"],
  ["fidf", true, "community"],
  ["magendavidadom", true, "community"],
  ["magen", true, "community"],
  ["mdaisrael", true, "community"],
  ["jewishnationalfund", true, "community"],
  ["kkljnf", true, "community"],
  ["jewishagencyisrael", true, "community"],
  ["birthrightisrael", true, "community"],
  ["taglit", true, "community"],
  ["masa", true, "community"],
  ["masaisrael", true, "community"],
  ["onwardisrael", true, "community"],
  ["israelspecialforces", true, "community"],
  ["ilantur", true, "community"],
  ["tlv1", true, "community"],
  ["kan11", true, "community"],
  ["kannemania", true, "community"],
  ["glztv", true, "community"],
  ["israelhayom", true, "community"],
  ["mako", true, "community"],
  ["keshet12", true, "community"],
  // Round 3 — more family-friendly
  ["pbsdigitalstudios", false, "learning"],
  ["pbsspacetime", false, "science"],
  ["pbsorigins", false, "history"],
  ["pbsamericantestkitchen", false, "cooking"],
  ["americastestkitchen", false, "cooking"],
  ["seriouseats", false, "cooking"],
  ["bonappetit", false, "cooking"],
  ["foodnetwork", false, "cooking"],
  ["tasty", false, "cooking"],
  ["babishculinaryuniverse", false, "cooking"],
  ["joshuaweissman", false, "cooking"],
  ["prohomecooks", false, "cooking"],
  ["sortedfood", false, "cooking"],
  ["jamieoliver", false, "cooking"],
  ["gordonramsay", false, "cooking"],
  ["kidsbakingchampionship", false, "cooking"],
  ["kidscooking", false, "cooking"],
  ["cookingwithkids", false, "cooking"],
  ["annreardon", false, "cooking"],
  ["howtomake", false, "science"],
  ["howstuffworks", false, "science"],
  ["seeker", false, "science"],
  ["seekerstories", false, "science"],
  ["greatbigstory", false, "family"],
  ["nowthis", false, "family"],
  ["vox", false, "learning"],
  ["voxdotcom", false, "learning"],
  ["polymatter", false, "learning"],
  ["wendoverproductions", false, "learning"],
  ["realengineering", false, "science"],
  ["mustarde", false, "science"],
  ["mustardechannel", false, "science"],
  ["thecodingtrain", false, "learning"],
  ["fireship", false, "learning"],
  ["freecodecamp", false, "learning"],
  ["traversymedia", false, "learning"],
  ["programmingwithmosh", false, "learning"],
  ["csdojo", false, "learning"],
  ["thenewboston", false, "learning"],
  ["3blue1brown", false, "science"],
  ["standupmaths", false, "science"],
  ["mathologer", false, "science"],
  ["numberphile2", false, "science"],
  ["singingbanana", false, "science"],
  ["tibees", false, "science"],
  ["physicsfun", false, "science"],
  ["veritasium2", false, "science"],
  ["smartereveryday2", false, "science"],
  ["cgpgrey", false, "learning"],
  ["cgpgreyclips", false, "learning"],
  ["tomscott", false, "learning"],
  ["tomscottplus", false, "learning"],
  ["geographyNow", false, "learning"],
  ["geographynow", false, "learning"],
  ["usefulcharts", false, "history"],
  ["oversimplified2", false, "history"],
  ["historiacivilis", false, "history"],
  ["kingsandgenerals", false, "history"],
  ["invicta", false, "history"],
  ["historymatters", false, "history"],
  ["tededorigamidaily", false, "crafts"],
  ["origamiinstructions", false, "crafts"],
  ["joenab", false, "crafts"],
  ["drawingwiffwaffles", false, "crafts"],
  ["markcrilley", false, "crafts"],
  ["drawwithjazza", false, "crafts"],
  ["proko", false, "crafts"],
  ["circlelineartschool", false, "crafts"],
  ["brokensymphony", false, "music"],
  ["twosetviolin", false, "music"],
  ["classicfm", false, "music"],
  ["halidonmusicclassical", false, "music"],
  ["lso", false, "music"],
  ["berlinphil", false, "music"],
  ["metopera", false, "music"],
  ["kennedycenter", false, "music"],
  ["carnegiehall", false, "music"],
  ["lincolncenter", false, "music"],
  ["sfsymphony", false, "music"],
  ["nyphil", false, "music"],
  ["disney", false, "family"],
  ["disneyjunior", false, "family"],
  ["disneyplus", false, "family"],
  ["pixar", false, "family"],
  ["dreamworks", false, "family"],
  ["illumination", false, "family"],
  ["sonyanimation", false, "family"],
  ["nickjr", false, "family"],
  ["nickjruk", false, "family"],
  ["cartoonito", false, "family"],
  ["cbeebieshouse", false, "family"],
  ["mrbeastgaming", false, "gaming"],
  ["dantdm", false, "gaming"],
  ["stampylonghead", false, "gaming"],
  ["stampylongnose", false, "gaming"],
  ["popularmmos", false, "gaming"],
  ["prestonplayz", false, "gaming"],
  ["unspeakable", false, "gaming"],
  ["fgteev", false, "gaming"],
  ["nogla", false, "gaming"],
  ["sSundee", false, "gaming"],
  ["ssundee", false, "gaming"],
  ["ldshadowlady", false, "gaming"],
  ["smallishbeans", false, "gaming"],
  ["impulseSV", false, "gaming"],
  ["impulsesv", false, "gaming"],
  ["grianmc", false, "gaming"],
  ["hermitcraft", false, "gaming"],
  ["cubfan135", false, "gaming"],
  ["iskall85", false, "gaming"],
  ["ethoslab", false, "gaming"],
  ["bdoubleo100", false, "gaming"],
  ["natgeowild", false, "nature"],
  ["discovery", false, "nature"],
  ["discoverychannel", false, "nature"],
  ["bbcearthunplugged", false, "nature"],
  ["ourplanet", false, "nature"],
  ["netflix", false, "family"],
  ["netflixjr", false, "family"],
  ["appletv", false, "family"],
  ["smithsonianzoo", false, "nature"],
  ["nationalzoo", false, "nature"],
  ["sdzsafaripark", false, "nature"],
  ["oregonzoo", false, "nature"],
  ["woodlandparkzoo", false, "nature"],
  ["houstonzoo", false, "nature"],
  ["dallaszoo", false, "nature"],
  ["columbuszoo", false, "nature"],
  ["cincinnatizoo", false, "nature"],
  ["stlzookeeper", false, "nature"],
  ["audubon", false, "nature"],
  ["audubonsociety", false, "nature"],
  ["wwf", false, "nature"],
  ["worldwildlife", false, "nature"],
  ["conservationintl", false, "nature"],
  ["janegoodallinst", false, "nature"],
  ["janegoodall", false, "nature"],
  ["davidsuzuki", false, "nature"],
  ["tedxnashville", false, "learning"],
  ["tedx", false, "learning"],
  ["tedxtalks", false, "learning"],
  ["bigthink", false, "learning"],
  ["worldsciencefestival", false, "science"],
  ["royalinstitution", false, "science"],
  ["richannel", false, "science"],
  ["exploratorium", false, "science"],
  ["mosboston", false, "science"],
  ["chicagomsi", false, "science"],
  ["calacademy", false, "science"],
  ["amnhnyc", false, "science"],
  ["fieldmuseum", false, "science"],
  ["smithsoniannmnh", false, "science"],
  ["airandspace", false, "science"],
  ["smithsonianairspace", false, "science"],
  ["intrepidmuseum", false, "history"],
  ["ussconstitution", false, "history"],
  ["nationalarchives", false, "history"],
  ["libraryofcongress", false, "history"],
  ["britishlibrary", false, "history"],
  ["britishmuseum", false, "history"],
  ["metmuseum", false, "history"],
  ["moma", false, "history"],
  ["guggenheim", false, "history"],
  ["tate", false, "history"],
  ["rijksmuseum", false, "history"],
  ["louvre", false, "history"],
  ["vaticanmuseums", false, "history"],
  ["gettymuseum", false, "history"],
  ["nga", false, "history"],
  ["nationalgallery", false, "history"],
  // Round 4 — 2026-11-06 more Jewish makers (probed @handles)
  ["RabbiSacks", true, "torah"],
  ["ManisFriedman", true, "torah"],
  ["MeaningfulMinute", true, "community"],
  ["OpenDorMedia", true, "learning"],
  ["UnpackedMedia", true, "learning"],
  ["JewishBookCouncil", true, "stories"],
  ["KarBenPublishing", true, "stories"],
  ["BehrmanHouse", true, "learning"],
  ["TorahAura", true, "learning"],
  ["HadarInstitute", true, "torah"],
  ["DrishaInstitute", true, "torah"],
  ["MDAIsrael", true, "community"],
  ["JewishMuseumBerlin", true, "history"],
  ["israelmuseum", true, "history"],
  ["jewishmuseumlondon", true, "history"],
  ["jewishfoodsociety", true, "cooking"],
  ["MayimBialik", true, "community"],
  ["IshayRiboOfficial", true, "music"],
  ["GadElbazOfficial", true, "music"],
  ["NissimBlackOfficial", true, "music"],
  ["MosheYess", true, "music"],
  ["yitzjordan", true, "music"],
  ["HebrewPod101", true, "hebrew"],
  ["streetwisehebrew", true, "hebrew"],
  ["PJLibraryOfficial", true, "learning"],
  ["HillelInternational", true, "community"],
  ["MasaIsraelJourney", true, "community"],
  ["OnwardIsrael", true, "community"],
  ["92ndStreetY", true, "community"],
  ["jewishedproject", true, "learning"],
  ["tanachstudy", true, "torah"],
  ["LeahCooksKosher", true, "cooking"],
  ["jewishwomensarchive", true, "history"],
  // Round 4 — more Family-Friendly (probed; no news / AI-gen)
  ["Vsauce3", false, "science"],
  ["Vsauce2Official", false, "science"],
  ["vsauce", false, "science"],
  ["vsauce2", false, "science"],
  ["ScishowKids", false, "science"],
  ["CrashCourseKids", false, "learning"],
  ["BrainPop", false, "learning"],
  ["BrainPOPJr", false, "learning"],
  ["NatGeoKids", false, "nature"],
  ["NatGeoAnimals", false, "nature"],
  ["BBCEarthKids", false, "nature"],
  ["SesameStreetOfficial", false, "learning"],
  ["BlueyOfficialChannel", false, "family"],
  ["BlueyCartoon", false, "family"],
  ["MisterRogersNeighborhood", false, "learning"],
  ["StorylineOnline", false, "stories"],
  ["BrightlyStorytime", false, "stories"],
  ["CosmicKidsYoga", false, "sports"],
  ["PinkfongBabyShark", false, "music"],
  ["SuperSimpleSongs", false, "music"],
  ["LittleAngelNursery", false, "music"],
  ["ArtForKidsHub", false, "crafts"],
  ["RedTedArt", false, "crafts"],
  ["EasyPeasyAndFun", false, "crafts"],
  ["MarkRober", false, "science"],
  ["SmarterEveryDay", false, "science"],
  ["VeritasiumOfficial", false, "science"],
  ["Numberphile2", false, "science"],
  ["standupmaths", false, "science"],
  ["TomScottGo", false, "learning"],
  ["RealEngineering", false, "science"],
  ["WendoverProductions", false, "learning"],
  ["KurzgesagtInANutshell", false, "science"],
  ["GenerationGenius", false, "science"],
  ["SmithsonianChannel", false, "history"],
  ["NASAKennedy", false, "science"],
  ["ScratchTeamOfficial", false, "learning"],
  ["KhanAcademyKids", false, "learning"],
  ["Duolingo", false, "learning"],
  ["ArduinoOfficial", false, "learning"],
  ["RaspberryPiFoundation", false, "learning"],
  ["legoeducation", false, "learning"],
  ["microbit", false, "learning"],
  ["NationalParkService", false, "nature"],
  ["nps", false, "nature"],
  ["MetMuseum", false, "history"],
  ["TheMuseumOfModernArt", false, "history"],
  ["RoyalInstitution", false, "science"],
  ["Makezine", false, "crafts"],
  ["ElectromakerIO", false, "science"],
  ["instructables", false, "crafts"],
  ["HowRidiculousOfficial", false, "sports"],
  ["MindYourDecisions", false, "science"],
  ["mathantics", false, "learning"],
  ["KidsAcademyOfficial", false, "learning"],
  ["kidsacademy", false, "learning"],
  ["BlippiOfficial", false, "learning"],
  ["blippi", false, "learning"],
  ["MsRachel", false, "learning"],
  ["MsRachelForKids", false, "learning"],
  ["tested", false, "science"],
  ["blenderguru", false, "crafts"],
  ["epicgardening", false, "nature"],
  ["howridiculous", false, "sports"],
  ["webbtelescope", false, "science"],
  ["seattleaquarium", false, "nature"],
  ["detroitzoo", false, "nature"],
  ["folkways", false, "music"],
  ["smithsonianfolkways", false, "music"],
  ["arduino", false, "learning"],
  ["raspberrypi", false, "learning"],
];

/** News stations / wire / broadcast — never import (even if listed above historically). */
const NEWS_HANDLES = new Set(
  [
    "vox",
    "voxdotcom",
    "nowthis",
    "mako",
    "keshet12",
    "israelhayom",
    "kan11",
    "kannemania",
    "glztv",
    "jtaorg",
    "jewishtelegraphicagency",
    "tabletmag",
    "tabletmagvideo",
    "forward",
    "memri",
    "memritv",
    "reuters",
    "bloomberg",
    "cnn",
    "msnbc",
    "foxnews",
    "cnbc",
    "abcnews",
    "nbcnews",
    "cbsnews",
    "bbcnews",
    "skynews",
    "aljazeera",
    "i24news",
    "i24newsenglish",
    "associatedpress",
    "aparchive",
    "wxyztvdetroit",
    "pix11news",
    "whyy",
    "iltvisraelnews",
    "allisraelnewscom",
    "timesofisrael",
    "haaretzcom",
    "thejerusalempost",
  ].map((h) => h.toLowerCase()),
);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function normalizeUsername(raw) {
  return String(raw || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^[-.]+|[-.]+$/g, "")
    .replace(/--+/g, "-")
    .slice(0, 30);
}

function isValidUsername(username) {
  return /^[a-z0-9](?:[a-z0-9._-]{0,28}[a-z0-9])?$|^[a-z0-9]$/.test(username);
}

function extractChannelId(html) {
  const patterns = [
    /"channelId":"(UC[\w-]{20,})"/,
    /"externalId":"(UC[\w-]{20,})"/,
    /youtube\.com\/channel\/(UC[\w-]{20,})/,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

function extractMeta(html, handle) {
  const channelId = extractChannelId(html);
  let name =
    html.match(/"channelMetadataRenderer":\{"title":"([^"\\]+)"/)?.[1] ||
    html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1] ||
    html.match(/"name":"([^"\\]{2,120})"/)?.[1] ||
    handle;
  if (/^(AUDIO_|CHECK_|PLAY_|ICON_|BUTTON_)/i.test(name)) {
    name =
      html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1] ||
      handle;
  }
  const description =
    html.match(/<meta property="og:description" content="([^"]*)"/i)?.[1] ||
    html.match(/"description":"([^"\\]{0,500})"/)?.[1]?.replace(/\\n/g, " ") ||
    "";
  const avatar =
    html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1] ||
    html.match(/"avatar":\{"thumbnails":\[\{"url":"([^"]+)"/)?.[1] ||
    null;
  const subsRaw =
    html.match(/"subscriberCountText":\{"simpleText":"([^"]+)"/)?.[1] ||
    html.match(/"subscriberCount":"(\d+)"/)?.[1];
  let subscriberCount = null;
  if (subsRaw) {
    const n = Number(String(subsRaw).replace(/[^\d]/g, ""));
    if (Number.isFinite(n) && n > 0) subscriberCount = n;
  }
  const cleanName = name
    .replace(/ - YouTube$/i, "")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .trim();
  return {
    channelId,
    name: cleanName,
    description: description.slice(0, 800),
    avatar,
    subscriberCount,
  };
}

function decodeXml(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseAtomFeed(xml) {
  const entries = [];
  for (const block of xml.split(/<entry>/i).slice(1)) {
    const youtubeId =
      block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i)?.[1] ||
      block.match(/\/watch\?v=([\w-]{6,})/)?.[1];
    const title = block.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
    const publishedAt =
      block.match(/<published>([^<]+)<\/published>/i)?.[1] ||
      block.match(/<updated>([^<]+)<\/updated>/i)?.[1];
    const channelName =
      block.match(/<name>([^<]*)<\/name>/i)?.[1]?.trim() || "";
    if (!youtubeId || !title || !publishedAt) continue;
    entries.push({
      youtubeId,
      title: decodeXml(title),
      publishedAt,
      channelName: decodeXml(channelName),
      thumbnailUrl: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
    });
  }
  return entries;
}

function parseVideosFromChannelHtml(html, channelName) {
  const entries = [];
  const seen = new Set();
  for (const m of html.matchAll(/"videoId":"([\w-]{11})"/g)) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    entries.push({
      youtubeId: id,
      title: `${channelName} video`,
      publishedAt: null,
      channelName,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    });
    if (entries.length >= 120) break;
  }
  return entries;
}

async function isEmbeddable(youtubeId, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${youtubeId}`,
      )}&format=json`;
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json" },
      });
      if (res.status === 429 || res.status >= 500) {
        await sleep(800 * (i + 1));
        continue;
      }
      if (!res.ok) return null;
      return res.json();
    } catch {
      await sleep(400 * (i + 1));
    }
  }
  return null;
}

async function fetchPublishedAt(youtubeId) {
  try {
    const watchRes = await fetch(
      `https://www.youtube.com/watch?v=${youtubeId}`,
      {
        headers: {
          "User-Agent": UA,
          Accept: "text/html",
          "Accept-Language": "en-US,en;q=0.9",
        },
      },
    );
    if (!watchRes.ok) return null;
    const html = await watchRes.text();
    const raw =
      html.match(/"uploadDate":"([^"]+)"/)?.[1] ||
      html.match(/"publishDate":"([^"]+)"/)?.[1];
    if (raw && !Number.isNaN(new Date(raw).getTime())) {
      return new Date(raw).toISOString();
    }
  } catch {
    /* ignore */
  }
  return null;
}

function guessCategory(title, isJewish, hint) {
  const t = title.toLowerCase();
  if (/\b(hanukkah|chanukah|purim|passover|pesach|sukkot|rosh|yom kippur|shavuot|lag ba)\b/.test(t))
    return ["holidays", "Holidays"];
  if (/\b(shabbat|shabbos|kabbalat)\b/.test(t)) return ["shabbat", "Shabbat"];
  if (/\b(modeh ani|shema|prayer|tefill|brach|bracha|amidah|oseh shalom)\b/.test(t))
    return ["prayer", "Prayer"];
  if (/\b(aleph|hebrew|ivrit|alphabet)\b/.test(t)) return ["hebrew", "Learning Hebrew"];
  if (/\b(parsha|torah|midrash|talmud|rashi|bible stor|holocaust|shoah)\b/.test(t))
    return ["torah", "Torah & Stories"];
  if (/\b(song|sing|music|a cappella|acapella|niggun|cover|nursery)\b/.test(t))
    return ["music", "Music"];
  if (/\b(cook|recipe|bake|kitchen|food|kosher)\b/.test(t)) return ["cooking", "Cooking"];
  if (/\b(minecraft|lego|roblox|gameplay|nintendo)\b/.test(t))
    return ["gaming", "Gaming"];
  if (/\b(craft|diy|origami|draw|paint)\b/.test(t)) return ["crafts", "Crafts & DIY"];
  if (/\b(science|experiment|how to|howto|physics|chemistry|space)\b/.test(t))
    return ["science", "Science & How-To"];
  if (/\b(nature|wildlife|animal|ocean|zoo|aquarium)\b/.test(t))
    return ["nature", "Nature"];
  if (/\b(history|civilization|empire|war|ancient)\b/.test(t))
    return ["history", "History"];
  if (/\b(yoga|sport|fitness|soccer|basketball)\b/.test(t)) return ["sports", "Sports"];
  if (hint) {
    const map = {
      torah: ["torah", "Torah & Stories"],
      community: ["community", "Community"],
      history: ["history", "History"],
      music: ["music", "Music"],
      hebrew: ["hebrew", "Learning Hebrew"],
      cooking: ["cooking", "Cooking"],
      learning: ["learning", "Kids Learning"],
      family: ["family", "Family & Calm"],
      science: ["science", "Science & How-To"],
      nature: ["nature", "Nature"],
      crafts: ["crafts", "Crafts & DIY"],
      sports: ["sports", "Sports"],
      holidays: ["holidays", "Holidays"],
    };
    if (map[hint]) return map[hint];
  }
  return isJewish ? ["family", "Family & Calm"] : ["family", "Family & Calm"];
}

async function ensureNewChannels() {
  const existing = await sql`
    SELECT slug, username, youtube_url FROM channels
  `;
  const byHandle = new Set();
  for (const row of existing) {
    if (row.username) byHandle.add(String(row.username).toLowerCase());
    const at = row.youtube_url?.match(/youtube\.com\/@([^/?#]+)/i)?.[1];
    if (at) byHandle.add(decodeURIComponent(at).toLowerCase());
    byHandle.add(String(row.slug).toLowerCase());
  }

  let added = 0;
  let skipped = 0;
  let failed = 0;
  for (const [handle, isJewish, hint] of NEW_CHANNELS) {
    const key = handle.toLowerCase();
    if (NEWS_HANDLES.has(key)) {
      skipped++;
      continue;
    }
    if (byHandle.has(key)) {
      skipped++;
      continue;
    }
    const url = `https://www.youtube.com/@${handle}`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "text/html" },
        redirect: "follow",
      });
      await sleep(250);
      if (!res.ok) {
        console.warn(`skip @${handle}: HTTP ${res.status}`);
        failed++;
        continue;
      }
      const html = await res.text();
      const meta = extractMeta(html, handle);
      if (!meta.channelId) {
        console.warn(`skip @${handle}: no channelId`);
        failed++;
        continue;
      }
      const username = normalizeUsername(handle);
      if (!isValidUsername(username)) {
        failed++;
        continue;
      }
      const slug = slugify(meta.name) || username;
      const taken = await sql`SELECT 1 FROM channels WHERE slug = ${slug} OR lower(username)=${username} LIMIT 1`;
      if (taken.length) {
        skipped++;
        continue;
      }
      await sql`
        INSERT INTO channels (
          slug, name, description, youtube_url, avatar_url,
          subscriber_count, is_jewish, username, youtube_channel_id, is_active
        ) VALUES (
          ${slug},
          ${meta.name},
          ${meta.description || ""},
          ${url},
          ${meta.avatar},
          ${meta.subscriberCount},
          ${isJewish},
          ${username},
          ${meta.channelId},
          TRUE
        )
        ON CONFLICT (slug) DO NOTHING
      `;
      byHandle.add(username);
      byHandle.add(slug);
      added++;
      console.log(`channel + @${username} (${meta.name}) jewish=${isJewish} hint=${hint}`);
    } catch (err) {
      failed++;
      console.warn(`fail @${handle}:`, err.message);
    }
  }
  return { added, skipped, failed };
}

async function resolveChannelId(ch) {
  if (ch.youtube_channel_id) return ch.youtube_channel_id;
  if (!ch.youtube_url) return null;
  const direct = ch.youtube_url.match(/youtube\.com\/channel\/(UC[\w-]+)/i);
  if (direct?.[1]) return direct[1];
  try {
    const res = await fetch(ch.youtube_url.replace(/\/$/, ""), {
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    return extractChannelId(await res.text());
  } catch {
    return null;
  }
}

async function fetchUploads(ch) {
  const channelId = await resolveChannelId(ch);
  if (channelId && channelId !== ch.youtube_channel_id) {
    await sql`
      UPDATE channels SET youtube_channel_id = ${channelId}
      WHERE id = ${ch.id}::uuid
    `;
    ch.youtube_channel_id = channelId;
  }
  const byId = new Map();
  if (channelId) {
    try {
      const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
      const res = await fetch(feedUrl, {
        headers: { "User-Agent": UA, Accept: "application/atom+xml,text/xml" },
      });
      if (res.ok) {
        for (const entry of parseAtomFeed(await res.text())) {
          byId.set(entry.youtubeId, entry);
        }
      }
    } catch {
      /* fall through */
    }
  }
  // Prefer Atom (has publishedAt). Only scrape HTML tabs when feed is thin.
  if (ch.youtube_url && byId.size < 20) {
    const base = ch.youtube_url.replace(/\/$/, "");
    for (const path of ["/videos", "/shorts"]) {
      try {
        const res = await fetch(base + path, {
          headers: { "User-Agent": UA, Accept: "text/html" },
          redirect: "follow",
        });
        if (!res.ok) continue;
        for (const entry of parseVideosFromChannelHtml(
          await res.text(),
          ch.name,
        )) {
          if (!byId.has(entry.youtubeId)) byId.set(entry.youtubeId, entry);
        }
        await sleep(200);
        if (byId.size >= 60) break;
      } catch {
        /* ignore tab */
      }
    }
  }
  return [...byId.values()];
}

async function expandVideos({ channelLimit = 280, perChannel = 28 } = {}) {
  const channels = await sql`
    SELECT ch.id, ch.slug, ch.name, ch.youtube_url, ch.youtube_channel_id,
           COALESCE(ch.is_jewish, TRUE) AS is_jewish,
           COUNT(v.id)::int AS video_count
    FROM channels ch
    LEFT JOIN videos v ON v.channel_id = ch.id AND v.is_active
    WHERE COALESCE(ch.is_active, TRUE) = TRUE
      AND ch.youtube_url IS NOT NULL
    GROUP BY ch.id
    ORDER BY COUNT(v.id) ASC, ch.name ASC
    LIMIT ${channelLimit}
  `;

  let inserted = 0;
  let skippedExisting = 0;
  let skippedEmbed = 0;
  let errors = 0;
  const existingRows = await sql`SELECT youtube_id FROM videos`;
  const existing = new Set(existingRows.map((r) => r.youtube_id));

  for (const ch of channels) {
    try {
      const uploads = await fetchUploads(ch);
      await sleep(180);
      let addedHere = 0;
      for (const entry of uploads.slice(0, perChannel)) {
        if (existing.has(entry.youtubeId)) {
          skippedExisting++;
          continue;
        }
        const meta = await isEmbeddable(entry.youtubeId);
        await sleep(160);
        if (!meta?.title) {
          skippedEmbed++;
          continue;
        }
        const title = meta.title || entry.title;
        const channelName = meta.author_name || entry.channelName || ch.name;
        const [categorySlug, category] = guessCategory(title, ch.is_jewish);
        const isShort =
          /\b#shorts\b/i.test(title) ||
          (meta.height && meta.width && meta.height > meta.width);

        // Watch pages are often bot-blocked; published_at may stay null.
        let publishedAt = entry.publishedAt;
        if (!publishedAt) {
          publishedAt = await fetchPublishedAt(entry.youtubeId);
          await sleep(60);
        }

        if (meta.author_url && /youtube\.com\/@/i.test(meta.author_url)) {
          const handle = normalizeUsername(
            meta.author_url.match(/youtube\.com\/@([^/?#]+)/i)?.[1],
          );
          if (isValidUsername(handle)) {
            try {
              await sql`
                UPDATE channels
                SET username = ${handle},
                    youtube_url = COALESCE(youtube_url, ${meta.author_url})
                WHERE id = ${ch.id}::uuid
                  AND NOT EXISTS (
                    SELECT 1 FROM channels c2
                    WHERE lower(c2.username) = ${handle}
                      AND c2.id <> ${ch.id}::uuid
                  )
              `;
            } catch {
              /* ignore */
            }
          }
        }

        await sql`
          INSERT INTO videos (
            youtube_id, title, description, channel_name, channel_id,
            category, category_slug, thumbnail_url, is_short, is_jewish,
            embeddable, is_active, published_at
          ) VALUES (
            ${entry.youtubeId},
            ${title},
            ${""},
            ${channelName},
            ${ch.id}::uuid,
            ${category},
            ${categorySlug},
            ${entry.thumbnailUrl || meta.thumbnail_url || `https://i.ytimg.com/vi/${entry.youtubeId}/hqdefault.jpg`},
            ${Boolean(isShort)},
            ${Boolean(ch.is_jewish)},
            TRUE,
            TRUE,
            ${publishedAt}
          )
          ON CONFLICT (youtube_id) DO NOTHING
        `;
        existing.add(entry.youtubeId);
        inserted++;
        addedHere++;
        if (addedHere <= 3 || addedHere % 5 === 0) {
          console.log(`+ ${ch.slug} ${entry.youtubeId} ${title.slice(0, 55)}`);
        }
      }
      console.log(
        `channel ${ch.slug} (had ${ch.video_count}): +${addedHere} / ${uploads.length} scanned`,
      );
    } catch (err) {
      errors++;
      console.warn(`channel fail ${ch.slug}:`, err.message);
    }
  }

  return {
    inserted,
    skippedExisting,
    skippedEmbed,
    errors,
    channels: channels.length,
  };
}

async function counts() {
  const rows = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM videos WHERE is_active) AS videos,
      (SELECT COUNT(*)::int FROM videos WHERE is_active AND embeddable) AS embeddable,
      (SELECT COUNT(*)::int FROM videos WHERE is_active AND COALESCE(is_jewish, TRUE)) AS jewish_videos,
      (SELECT COUNT(*)::int FROM videos WHERE is_active AND NOT COALESCE(is_jewish, TRUE)) AS family_only_videos,
      (SELECT COUNT(*)::int FROM videos WHERE is_active AND is_short) AS shorts,
      (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active, TRUE)) AS channels,
      (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active, TRUE) AND COALESCE(is_jewish, TRUE)) AS jewish_channels,
      (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active, TRUE) AND NOT COALESCE(is_jewish, TRUE)) AS family_channels,
      (SELECT COUNT(*)::int FROM channels WHERE youtube_url ~* 'youtube\\.com/@') AS channels_with_at_url
  `;
  return rows[0];
}

async function exportSeedSnapshot() {
  const channels = await sql`
    SELECT slug, name, description, youtube_url, avatar_url, banner_url,
           subscriber_count, COALESCE(is_jewish, TRUE) AS is_jewish, username
    FROM channels
    WHERE COALESCE(is_active, TRUE)
    ORDER BY name
  `;
  const videos = await sql`
    SELECT v.youtube_id, v.title, v.description, ch.slug AS channel_slug,
           v.channel_name, v.category_slug, v.category, v.thumbnail_url,
           TRUE AS embeddable, COALESCE(v.is_short, FALSE) AS is_short,
           COALESCE(v.is_jewish, TRUE) AS is_jewish
    FROM videos v
    JOIN channels ch ON ch.id = v.channel_id
    WHERE v.is_active AND v.embeddable
    ORDER BY v.published_at DESC NULLS LAST
  `;
  const byCat = {};
  for (const v of videos) {
    const key = v.category_slug || "family";
    byCat[key] = (byCat[key] || 0) + 1;
  }
  const payload = {
    counts: {
      videos: videos.length,
      channels: channels.length,
      by_category: byCat,
    },
    channels,
    videos,
  };
  writeFileSync(
    resolve(root, "data/catalog-seed.json"),
    JSON.stringify(payload, null, 2) + "\n",
  );
  return payload.counts;
}

console.log("=== before ===");
const before = await counts();
console.log(JSON.stringify(before, null, 2));

console.log("=== deactivate news-handle channels (policy: no News) ===");
const newsDeactivated = await sql`
  UPDATE channels
  SET is_active = FALSE
  WHERE COALESCE(is_active, TRUE) = TRUE
    AND (
      lower(COALESCE(username, '')) = ANY(${[...NEWS_HANDLES]})
      OR lower(slug) = ANY(${[
        "vox",
        "12",
        "associated-press",
        "ap-archive",
        "wxyz-tv-detroit-channel-7",
        "i24news-english",
        "11",
        "mako",
        "kanisrael",
      ]})
    )
  RETURNING slug, username
`;
if (newsDeactivated.length) {
  await sql`
    UPDATE videos
    SET is_active = FALSE, updated_at = NOW()
    WHERE is_active = TRUE
      AND channel_id IN (
        SELECT id FROM channels WHERE slug = ANY(${newsDeactivated.map((r) => r.slug)})
      )
  `;
}
console.log(
  JSON.stringify(
    { deactivated: newsDeactivated.map((r) => r.slug) },
    null,
    2,
  ),
);

console.log("=== add curated @handle channels ===");
const chSummary = await ensureNewChannels();
console.log(JSON.stringify(chSummary, null, 2));

console.log("=== expand iframe-verified uploads (thin channels first) ===");
const expandSummary = await expandVideos({ channelLimit: 480, perChannel: 40 });
console.log(JSON.stringify(expandSummary, null, 2));

console.log("=== after ===");
const after = await counts();
console.log(JSON.stringify(after, null, 2));

console.log("=== export seed snapshot ===");
const seedCounts = await exportSeedSnapshot();
console.log(JSON.stringify(seedCounts, null, 2));

console.log(
  JSON.stringify(
    {
      delta_videos: after.videos - before.videos,
      delta_channels: after.channels - before.channels,
      before,
      after,
      channels_added: chSummary.added,
      videos_inserted: expandSummary.inserted,
    },
    null,
    2,
  ),
);

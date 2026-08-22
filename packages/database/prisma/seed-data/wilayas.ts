/**
 * The 58 wilayas of Algeria (global reference data, shared by every website).
 * A representative set of communes is seeded per wilaya for the demo; the full
 * commune list can be imported later without schema changes.
 */
export interface WilayaSeed {
  code: string;
  nameFr: string;
  nameAr: string;
  communes: string[];
}

export const WILAYAS: WilayaSeed[] = [
  { code: "01", nameFr: "Adrar", nameAr: "أدرار", communes: ["Adrar", "Reggane", "Aoulef", "Timimoun"] },
  { code: "02", nameFr: "Chlef", nameAr: "الشلف", communes: ["Chlef", "Ténès", "Boukadir", "Ouled Fares"] },
  { code: "03", nameFr: "Laghouat", nameAr: "الأغواط", communes: ["Laghouat", "Aflou", "Ksar El Hirane"] },
  { code: "04", nameFr: "Oum El Bouaghi", nameAr: "أم البواقي", communes: ["Oum El Bouaghi", "Aïn Beïda", "Aïn M'lila"] },
  { code: "05", nameFr: "Batna", nameAr: "باتنة", communes: ["Batna", "Barika", "Arris", "Merouana"] },
  { code: "06", nameFr: "Béjaïa", nameAr: "بجاية", communes: ["Béjaïa", "Akbou", "El Kseur", "Amizour"] },
  { code: "07", nameFr: "Biskra", nameAr: "بسكرة", communes: ["Biskra", "Tolga", "Ouled Djellal", "Sidi Okba"] },
  { code: "08", nameFr: "Béchar", nameAr: "بشار", communes: ["Béchar", "Kenadsa", "Abadla"] },
  { code: "09", nameFr: "Blida", nameAr: "البليدة", communes: ["Blida", "Boufarik", "Bouinan", "Larbaa", "Mouzaïa"] },
  { code: "10", nameFr: "Bouira", nameAr: "البويرة", communes: ["Bouira", "Lakhdaria", "Sour El Ghozlane", "M'Chedallah"] },
  { code: "11", nameFr: "Tamanrasset", nameAr: "تمنراست", communes: ["Tamanrasset", "In Salah", "In Guezzam"] },
  { code: "12", nameFr: "Tébessa", nameAr: "تبسة", communes: ["Tébessa", "Cheria", "El Aouinet", "Bir El Ater"] },
  { code: "13", nameFr: "Tlemcen", nameAr: "تلمسان", communes: ["Tlemcen", "Maghnia", "Ghazaouet", "Remchi", "Nedroma"] },
  { code: "14", nameFr: "Tiaret", nameAr: "تيارت", communes: ["Tiaret", "Sougueur", "Frenda", "Ksar Chellala"] },
  { code: "15", nameFr: "Tizi Ouzou", nameAr: "تيزي وزو", communes: ["Tizi Ouzou", "Azazga", "Draâ El Mizan", "Larbaâ Nath Irathen", "Boghni"] },
  { code: "16", nameFr: "Alger", nameAr: "الجزائر", communes: ["Alger Centre", "Bab El Oued", "Hussein Dey", "El Harrach", "Bir Mourad Raïs", "Dély Ibrahim", "Chéraga", "Bab Ezzouar", "Draria", "Birtouta"] },
  { code: "17", nameFr: "Djelfa", nameAr: "الجلفة", communes: ["Djelfa", "Aïn Oussera", "Messaad", "Hassi Bahbah"] },
  { code: "18", nameFr: "Jijel", nameAr: "جيجل", communes: ["Jijel", "Taher", "El Milia", "Chekfa"] },
  { code: "19", nameFr: "Sétif", nameAr: "سطيف", communes: ["Sétif", "El Eulma", "Aïn Oulmène", "Bougaa", "Aïn Arnat"] },
  { code: "20", nameFr: "Saïda", nameAr: "سعيدة", communes: ["Saïda", "Aïn El Hadjar", "Youb"] },
  { code: "21", nameFr: "Skikda", nameAr: "سكيكدة", communes: ["Skikda", "Azzaba", "Collo", "El Harrouch"] },
  { code: "22", nameFr: "Sidi Bel Abbès", nameAr: "سيدي بلعباس", communes: ["Sidi Bel Abbès", "Télagh", "Sfisef", "Ben Badis"] },
  { code: "23", nameFr: "Annaba", nameAr: "عنابة", communes: ["Annaba", "El Bouni", "El Hadjar", "Berrahal"] },
  { code: "24", nameFr: "Guelma", nameAr: "قالمة", communes: ["Guelma", "Oued Zenati", "Bouchegouf", "Héliopolis"] },
  { code: "25", nameFr: "Constantine", nameAr: "قسنطينة", communes: ["Constantine", "El Khroub", "Hamma Bouziane", "Aïn Smara", "Zighoud Youcef"] },
  { code: "26", nameFr: "Médéa", nameAr: "المدية", communes: ["Médéa", "Berrouaghia", "Ksar El Boukhari", "Tablat"] },
  { code: "27", nameFr: "Mostaganem", nameAr: "مستغانم", communes: ["Mostaganem", "Aïn Tédelès", "Kheir Eddine", "Hassi Mamèche"] },
  { code: "28", nameFr: "M'Sila", nameAr: "المسيلة", communes: ["M'Sila", "Bou Saâda", "Sidi Aïssa", "Aïn El Melh"] },
  { code: "29", nameFr: "Mascara", nameAr: "معسكر", communes: ["Mascara", "Sig", "Mohammadia", "Tighennif"] },
  { code: "30", nameFr: "Ouargla", nameAr: "ورقلة", communes: ["Ouargla", "Hassi Messaoud", "Touggourt", "N'Goussa"] },
  { code: "31", nameFr: "Oran", nameAr: "وهران", communes: ["Oran", "Es Sénia", "Bir El Djir", "Arzew", "Aïn El Turk", "Bethioua"] },
  { code: "32", nameFr: "El Bayadh", nameAr: "البيض", communes: ["El Bayadh", "Bougtoub", "Rogassa"] },
  { code: "33", nameFr: "Illizi", nameAr: "إليزي", communes: ["Illizi", "Djanet", "In Amenas"] },
  { code: "34", nameFr: "Bordj Bou Arréridj", nameAr: "برج بوعريريج", communes: ["Bordj Bou Arréridj", "Ras El Oued", "Mansoura", "El Achir"] },
  { code: "35", nameFr: "Boumerdès", nameAr: "بومرداس", communes: ["Boumerdès", "Boudouaou", "Dellys", "Bordj Menaïel", "Thénia"] },
  { code: "36", nameFr: "El Tarf", nameAr: "الطارف", communes: ["El Tarf", "El Kala", "Ben M'Hidi", "Bouhadjar"] },
  { code: "37", nameFr: "Tindouf", nameAr: "تندوف", communes: ["Tindouf"] },
  { code: "38", nameFr: "Tissemsilt", nameAr: "تيسمسيلت", communes: ["Tissemsilt", "Théniet El Had", "Bordj Bou Naama"] },
  { code: "39", nameFr: "El Oued", nameAr: "الوادي", communes: ["El Oued", "Robbah", "Djamaâ", "El M'Ghaïer"] },
  { code: "40", nameFr: "Khenchela", nameAr: "خنشلة", communes: ["Khenchela", "Kaïs", "Chechar"] },
  { code: "41", nameFr: "Souk Ahras", nameAr: "سوق أهراس", communes: ["Souk Ahras", "Sedrata", "M'Daourouche"] },
  { code: "42", nameFr: "Tipaza", nameAr: "تيبازة", communes: ["Tipaza", "Cherchell", "Koléa", "Hadjout", "Fouka"] },
  { code: "43", nameFr: "Mila", nameAr: "ميلة", communes: ["Mila", "Ferdjioua", "Chelghoum Laïd", "Grarem Gouga"] },
  { code: "44", nameFr: "Aïn Defla", nameAr: "عين الدفلى", communes: ["Aïn Defla", "Khemis Miliana", "Miliana", "El Attaf"] },
  { code: "45", nameFr: "Naâma", nameAr: "النعامة", communes: ["Naâma", "Mécheria", "Aïn Sefra"] },
  { code: "46", nameFr: "Aïn Témouchent", nameAr: "عين تموشنت", communes: ["Aïn Témouchent", "Hammam Bou Hadjar", "El Malah", "Beni Saf"] },
  { code: "47", nameFr: "Ghardaïa", nameAr: "غرداية", communes: ["Ghardaïa", "Metlili", "Berriane", "El Guerrara"] },
  { code: "48", nameFr: "Relizane", nameAr: "غليزان", communes: ["Relizane", "Oued Rhiou", "Mazouna", "Zemmoura"] },
  { code: "49", nameFr: "Timimoun", nameAr: "تيميمون", communes: ["Timimoun", "Ouled Saïd"] },
  { code: "50", nameFr: "Bordj Badji Mokhtar", nameAr: "برج باجي مختار", communes: ["Bordj Badji Mokhtar"] },
  { code: "51", nameFr: "Ouled Djellal", nameAr: "أولاد جلال", communes: ["Ouled Djellal", "Sidi Khaled"] },
  { code: "52", nameFr: "Béni Abbès", nameAr: "بني عباس", communes: ["Béni Abbès", "Kerzaz"] },
  { code: "53", nameFr: "In Salah", nameAr: "عين صالح", communes: ["In Salah", "Foggaret Ezzoua"] },
  { code: "54", nameFr: "In Guezzam", nameAr: "عين قزام", communes: ["In Guezzam"] },
  { code: "55", nameFr: "Touggourt", nameAr: "تقرت", communes: ["Touggourt", "Témacine", "Megarine"] },
  { code: "56", nameFr: "Djanet", nameAr: "جانت", communes: ["Djanet"] },
  { code: "57", nameFr: "El M'Ghaïer", nameAr: "المغير", communes: ["El M'Ghaïer", "Djamaa"] },
  { code: "58", nameFr: "El Meniaa", nameAr: "المنيعة", communes: ["El Meniaa", "Hassi Gara"] },
];

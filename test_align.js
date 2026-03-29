function alignFurigana(kanji, kana) {
  if (!kanji || !kana || kanji === kana) return kanji;

  let result = '';
  let i = 0; // kanji index
  let j = 0; // kana index

  // Find prefix matches
  while (i < kanji.length && j < kana.length && kanji[i] === kana[j]) {
    result += kanji[i];
    i++;
    j++;
  }

  // Find suffix matches from the end
  let kSuffix = kanji.length - 1;
  let jSuffix = kana.length - 1;
  let suffix = '';
  while (kSuffix >= i && jSuffix >= j && kanji[kSuffix] === kana[jSuffix]) {
    suffix = kanji[kSuffix] + suffix;
    kSuffix--;
    jSuffix--;
  }

  // The middle part is the ruby mapping
  const kanjiMid = kanji.substring(i, kSuffix + 1);
  const kanaMid = kana.substring(j, jSuffix + 1);

  if (kanjiMid) {
    result += `<ruby>${kanjiMid}<rt class="text-[10px] opacity-60 font-medium">${kanaMid}</rt></ruby>`;
  } else if (kanaMid) {
     // No kanji mid but kana mid? Just output kana
     result += kanaMid;
  }

  result += suffix;
  return result;
}

// Test cases
console.log("Aligning 日本語 / にほんご:", alignFurigana("日本語", "にほんご"));
console.log("Aligning 勉強する / べんきょうする:", alignFurigana("勉強する", "べんきょうする"));
console.log("Aligning お久しぶりです / おひさしぶりです:", alignFurigana("お久しぶりです", "おひさしぶりです"));
console.log("Aligning 食べる / たべる:", alignFurigana("食べる", "たべる"));

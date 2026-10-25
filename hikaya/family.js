/* Hikaya — supporting characters (Oct 2026).
   Some stories have family members who appear in one or more illustrations next to the child.
   Parents can add a free photo of each one; anyone left without a photo is drawn as an
   AI-illustrated character instead. Shared by personalize, cart, checkout and the admin dashboard.

   Cart / order item field:
     supportingCharacters: [{ role: 'mother', photoPaths: ['2026-10-21/<hash>.jpg'] }, { role: 'father', photoPaths: [] }]
     supportingChoice: 'photos' | 'avatar'   (what the parent answered)
   A role with no photo paths = AI-illustrated character. */
(function () {
  'use strict';

  // Story slug -> family members who appear in it (order = order shown to the parent).
  const STORIES = {
    'house-of-missing-things': ['mother', 'father'],
    'grandpas-wild-safari': ['grandfather'],
    'the-christmas-list': ['mother', 'grandmother'],
    'the-last-box': ['mother'],
    'just-one-more': ['mother', 'father'],
  };

  const ROLES = {
    mother: { en: 'Mum', ar: 'الأم', admin: 'Mother', fem: true },
    father: { en: 'Dad', ar: 'الأب', admin: 'Father', fem: false },
    grandfather: { en: 'Grandpa', ar: 'الجد', admin: 'Grandfather', fem: false },
    grandmother: { en: 'Grandma', ar: 'الجدة', admin: 'Grandmother', fem: true },
  };

  const lang = () => { try { return window.hikayaLang && window.hikayaLang() === 'ar' ? 'ar' : 'en'; } catch (_) { return 'en'; } };
  const rolesFor = slug => (STORIES[slug] || []).slice();
  const label = (role, l) => { const r = ROLES[role]; return r ? (r[l || lang()] || r.en) : String(role || ''); };
  const adminLabel = role => (ROLES[role] && ROLES[role].admin) || String(role || '');
  const joinWho = (roles, l) => {
    l = l || lang();
    const n = roles.map(r => label(r, l));
    if (n.length < 2) return n[0] || '';
    return l === 'ar' ? n.slice(0, -1).join('، ') + ' و' + n[n.length - 1] : n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1];
  };
  const hasPhoto = c => !!(c && Array.isArray(c.photoPaths) && c.photoPaths.length);

  /* Short line for cart and checkout, e.g. "Mum: photo added · Dad: AI-illustrated". */
  function summary(item, l) {
    l = l || lang();
    const list = (item && Array.isArray(item.supportingCharacters)) ? item.supportingCharacters : [];
    if (!list.length) return '';
    return list.map(c => label(c.role, l) + ': ' + (hasPhoto(c)
      ? (l === 'ar' ? 'تمت إضافة الصورة' : 'photo added')
      : (l === 'ar' ? 'شخصية مرسومة بالذكاء الاصطناعي' : 'AI-illustrated'))).join(' · ');
  }

  window.HikayaFamily = { STORIES, ROLES, rolesFor, label, adminLabel, joinWho, hasPhoto, summary, lang };
})();

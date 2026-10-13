/* Hikaya CRM — ready-made campaign emails (Oct 2026).
   Each one has an English and an Arabic version and a suggested audience. They open in
   the campaign editor, where every word, photo, story and code can be changed.
   Arabic copy has no full stops (house style).

   Block types: eyebrow, heading, subheading, text, small, hand, button, image, story,
   code, divider, signoff. In text: **bold**, *italic*, [link](stories.html).
   Personal tokens: {{first_name}} (falls back to "there" / "صديقنا"), {{first_name|fallback}}, {{code}}. */
(function () {
  'use strict';
  const img = f => 'images/' + f;

  window.HK_CRM_TEMPLATES = [
    {
      key: 'launch',
      name: 'Launch: Hikaya is here',
      desc: 'Announce the shop to everyone who can be emailed. Optional launch code.',
      audience: { segment: 'all' },
      content: {
        en: {
          subject: 'Hikaya is here: the storybook where your child is the hero',
          preheader: 'Personalised hardcover books, gift-boxed and delivered across the UAE and GCC.',
          blocks: [
            { t: 'image', url: img('hero-bedroom-wide.jpg'), alt: 'A child reading her personalised Hikaya book', link: 'stories.html' },
            { t: 'eyebrow', text: 'Now open' },
            { t: 'heading', text: 'The story where your child is the hero' },
            { t: 'text', text: 'Hi {{first_name}},\n\nToday we open the doors to Hikaya: hardcover storybooks illustrated with your child\'s own likeness, so they see themselves on every page as the brave, kind and curious hero of the story.' },
            { t: 'subheading', text: 'Made in three simple steps' },
            { t: 'text', text: '**1. Choose a story** for ages 2–4, 4–6 or 6–8\n**2. Add a photo**, your child\'s name and age\n**3. We illustrate, print and gift-box it**, then deliver it to your door' },
            { t: 'text', text: 'Every book opens with a message to your child, written by you, and can be read in English or Arabic.' },
            { t: 'code', note: 'Our launch thank-you. Enter it at checkout.' },
            { t: 'button', label: 'Create their story →', url: 'stories.html' },
            { t: 'small', text: 'Free delivery across the UAE · About 5 working days to the UAE and KSA · Uploaded photos are deleted after 15 days' },
            { t: 'signoff' },
          ],
        },
        ar: {
          subject: 'حكاية وصلت: القصة التي يكون فيها طفلك هو البطل',
          preheader: 'كتب قصص مخصّصة بغلاف مقوّى، في علبة هدية، تصل إلى الإمارات ودول الخليج',
          blocks: [
            { t: 'image', url: img('hero-bedroom-wide.jpg'), alt: 'طفلة تقرأ كتاب حكاية الخاص بها', link: 'stories.html' },
            { t: 'eyebrow', text: 'افتتاح حكاية' },
            { t: 'heading', text: 'القصة التي يكون فيها طفلك هو البطل' },
            { t: 'text', text: 'مرحبًا {{first_name}}،\n\nاليوم نفتح أبواب حكاية: كتب قصص بغلاف مقوّى تُرسم فيها ملامح طفلك، ليرى نفسه في كل صفحة بطلًا شجاعًا ولطيفًا ومحبًا للاكتشاف' },
            { t: 'subheading', text: 'ثلاث خطوات بسيطة' },
            { t: 'text', text: '• **اختر قصة** لعمر 2 إلى 4 أو 4 إلى 6 أو 6 إلى 8\n• **أضف صورة** مع اسم طفلك وعمره\n• **نرسمها ونطبعها ونغلّفها كهدية** ثم نوصلها إلى بابك' },
            { t: 'text', text: 'يبدأ كل كتاب برسالة منك إلى طفلك، ويمكن قراءته بالعربية أو الإنجليزية' },
            { t: 'code', note: 'هدية الافتتاح منّا، أدخله عند الدفع' },
            { t: 'button', label: 'اصنع قصته ←', url: 'stories.html' },
            { t: 'small', text: 'توصيل مجاني داخل الإمارات · نحو 5 أيام عمل إلى الإمارات والسعودية · تُحذف الصور المرفوعة بعد 15 يومًا' },
            { t: 'signoff' },
          ],
        },
      },
    },

    {
      key: 'eid',
      name: 'Eid gift',
      desc: 'Seasonal gifting push with a featured story and bundle savings.',
      audience: { segment: 'all' },
      content: {
        en: {
          subject: 'An Eid gift they will keep for years',
          preheader: 'A storybook with their name and face in it, gift-boxed and ready to give.',
          blocks: [
            { t: 'image', url: img('giftbag-set.jpg'), alt: 'Hikaya gift bag and gift box', link: 'stories.html' },
            { t: 'eyebrow', text: 'Eid gifting' },
            { t: 'heading', text: 'This Eid, give a story with their name in it' },
            { t: 'text', text: 'Hi {{first_name}},\n\nToys get outgrown. A storybook where your child is the hero gets read at bedtime, shown proudly to grandparents and kept on the shelf for years.' },
            { t: 'text', text: 'Every Hikaya book arrives **gift-boxed**, with your own message on the first page. We can also send it straight to the family you are celebrating with.' },
            { t: 'story', slug: '', note: '' },
            { t: 'code', note: 'Our Eid gift to you. Enter it at checkout.' },
            { t: 'button', label: 'Choose an Eid story →', url: 'stories.html' },
            { t: 'small', text: 'Order early: about 5 working days to the UAE and KSA, 7 to the rest of the GCC. Two books save 10% and three or more save 15%, with free delivery.' },
            { t: 'signoff' },
          ],
        },
        ar: {
          subject: 'هدية عيد تبقى معهم سنوات',
          preheader: 'كتاب قصة باسمه وملامحه، في علبة هدية جاهزة للإهداء',
          blocks: [
            { t: 'image', url: img('giftbag-set.jpg'), alt: 'حقيبة وعلبة هدايا حكاية', link: 'stories.html' },
            { t: 'eyebrow', text: 'هدايا العيد' },
            { t: 'heading', text: 'هذا العيد، أهدِ قصة تحمل اسمه' },
            { t: 'text', text: 'مرحبًا {{first_name}}،\n\nالألعاب يكبر عليها الأطفال، أما القصة التي يكون فيها طفلك هو البطل فتُقرأ قبل النوم، ويعرضها بفخر على جدّه وجدّته، وتبقى على الرف سنوات' },
            { t: 'text', text: 'يصل كل كتاب من حكاية **في علبة هدية** مع رسالتك الخاصة في الصفحة الأولى، ويمكننا إرساله مباشرة إلى العائلة التي تحتفل معها' },
            { t: 'story', slug: '', note: '' },
            { t: 'code', note: 'هديتنا لك في العيد، أدخله عند الدفع' },
            { t: 'button', label: 'اختر قصة العيد ←', url: 'stories.html' },
            { t: 'small', text: 'اطلب مبكرًا: نحو 5 أيام عمل إلى الإمارات والسعودية و7 أيام لبقية دول الخليج، وفّر 10% عند شراء كتابين و15% عند شراء ثلاثة أو أكثر مع توصيل مجاني' },
            { t: 'signoff' },
          ],
        },
      },
    },

    {
      key: 'thankyou',
      name: 'Thank you + next book',
      desc: 'For customers: thank them and invite the next book in their collection.',
      audience: { segment: 'customers' },
      content: {
        en: {
          subject: 'A thank-you from Hikaya, and a little gift',
          preheader: 'Their collection can grow with them, one story for every age.',
          blocks: [
            { t: 'image', url: img('bunny-card-books.jpg'), alt: 'A shelf of Hikaya books', link: 'stories.html' },
            { t: 'eyebrow', text: 'From all of us' },
            { t: 'heading', text: 'Thank you for making Hikaya part of your family' },
            { t: 'text', text: 'Hi {{first_name}},\n\nBehind every book is a small team in the UAE who took real care over your child\'s story. Thank you for trusting us with it.' },
            { t: 'text', text: 'Many families build a collection: a new story for each age band, so the books grow up alongside their child. As a thank-you, here is something for your next one.' },
            { t: 'code', note: '' },
            { t: 'story', slug: '', note: '' },
            { t: 'button', label: 'Choose the next story →', url: 'stories.html' },
            { t: 'small', text: 'Loved your book? Simply reply and tell us. Your words help other families find us.' },
            { t: 'signoff' },
          ],
        },
        ar: {
          subject: 'شكرًا من حكاية، ومعها هدية صغيرة',
          preheader: 'مجموعته يمكن أن تكبر معه، قصة لكل عمر',
          blocks: [
            { t: 'image', url: img('bunny-card-books.jpg'), alt: 'رف من كتب حكاية', link: 'stories.html' },
            { t: 'eyebrow', text: 'من فريق حكاية' },
            { t: 'heading', text: 'شكرًا لأنك جعلت حكاية جزءًا من عائلتك' },
            { t: 'text', text: 'مرحبًا {{first_name}}،\n\nخلف كل كتاب فريق صغير في الإمارات اعتنى بقصة طفلك بكل حب، شكرًا لثقتك بنا' },
            { t: 'text', text: 'كثير من العائلات تبني مجموعة: قصة جديدة لكل مرحلة عمرية، فتكبر الكتب مع الطفل، وتقديرًا لك هذه هدية لكتابك القادم' },
            { t: 'code', note: '' },
            { t: 'story', slug: '', note: '' },
            { t: 'button', label: 'اختر القصة التالية ←', url: 'stories.html' },
            { t: 'small', text: 'أحببت الكتاب؟ ردّ على هذه الرسالة وأخبرنا، فكلماتك تساعد عائلات أخرى على اكتشافنا' },
            { t: 'signoff' },
          ],
        },
      },
    },

    {
      key: 'nudge',
      name: 'Gentle nudge',
      desc: 'For people who signed up or started a book but have not ordered yet.',
      audience: { segment: 'never_bought' },
      content: {
        en: {
          subject: 'Still thinking about it? Here is how Hikaya works',
          preheader: 'Two minutes to start, and we take care of the rest.',
          blocks: [
            { t: 'image', url: img('child-reading-closeup.jpg'), alt: 'A child reading her Hikaya book', link: 'stories.html' },
            { t: 'eyebrow', text: 'Whenever you are ready' },
            { t: 'heading', text: 'Their story only takes a couple of minutes to start' },
            { t: 'text', text: 'Hi {{first_name}},\n\nYou only need three things: your child\'s **name**, their **age** and **one clear photo**. Our illustrators do the rest, and the finished book arrives gift-boxed.' },
            { t: 'text', text: 'A few questions parents often ask:\n**Is my child\'s photo safe?** It is used only for the illustrations and deleted after 15 days.\n**Which language?** Every story comes in English or Arabic.\n**How long?** About 5 working days to the UAE and KSA.' },
            { t: 'code', note: 'A small welcome from us.' },
            { t: 'button', label: 'Start their story →', url: 'stories.html' },
            { t: 'small', text: 'Have a question first? Reply to this email or message us on WhatsApp.' },
            { t: 'signoff' },
          ],
        },
        ar: {
          subject: 'ما زلت تفكر؟ هكذا تعمل حكاية',
          preheader: 'دقيقتان للبدء، ونحن نتولى الباقي',
          blocks: [
            { t: 'image', url: img('child-reading-closeup.jpg'), alt: 'طفلة تقرأ كتاب حكاية', link: 'stories.html' },
            { t: 'eyebrow', text: 'متى ما كنت مستعدًا' },
            { t: 'heading', text: 'قصته لا تحتاج إلا دقيقتين للبدء' },
            { t: 'text', text: 'مرحبًا {{first_name}}،\n\nكل ما تحتاجه ثلاثة أشياء: **اسم** طفلك و**عمره** و**صورة واضحة** واحدة، ورسّامونا يتولّون الباقي، ويصلك الكتاب في علبة هدية' },
            { t: 'text', text: 'أسئلة يطرحها الأهل كثيرًا:\n**هل صورة طفلي آمنة؟** تُستخدم للرسوم فقط وتُحذف بعد 15 يومًا\n**بأي لغة؟** كل قصة متوفرة بالعربية أو الإنجليزية\n**كم يستغرق؟** نحو 5 أيام عمل إلى الإمارات والسعودية' },
            { t: 'code', note: 'ترحيب صغير منّا' },
            { t: 'button', label: 'ابدأ قصته ←', url: 'stories.html' },
            { t: 'small', text: 'لديك سؤال أولًا؟ ردّ على هذه الرسالة أو راسلنا على واتساب' },
            { t: 'signoff' },
          ],
        },
      },
    },

    {
      key: 'newstory',
      name: 'New story release',
      desc: 'Introduce a new title from your catalogue.',
      audience: { segment: 'all' },
      content: {
        en: {
          subject: 'A new Hikaya story has just arrived',
          preheader: 'Meet the newest adventure your child can star in.',
          blocks: [
            { t: 'eyebrow', text: 'Just released' },
            { t: 'heading', text: 'A brand-new adventure, starring your child' },
            { t: 'text', text: 'Hi {{first_name}},\n\nWe have just added a new story to the Hikaya library, and we think your little one will love being its hero.' },
            { t: 'story', slug: '', note: '' },
            { t: 'image', url: img('book-flatlay.jpg'), alt: 'A Hikaya hardcover book', link: 'stories.html' },
            { t: 'button', label: 'Discover the story →', url: 'stories.html' },
            { t: 'signoff' },
          ],
        },
        ar: {
          subject: 'قصة جديدة وصلت إلى حكاية',
          preheader: 'تعرّف إلى أحدث مغامرة يمكن أن يكون طفلك بطلها',
          blocks: [
            { t: 'eyebrow', text: 'جديدنا' },
            { t: 'heading', text: 'مغامرة جديدة، بطلها طفلك' },
            { t: 'text', text: 'مرحبًا {{first_name}}،\n\nأضفنا قصة جديدة إلى مكتبة حكاية، ونظن أن صغيرك سيحب أن يكون بطلها' },
            { t: 'story', slug: '', note: '' },
            { t: 'image', url: img('book-flatlay.jpg'), alt: 'كتاب حكاية بغلاف مقوّى', link: 'stories.html' },
            { t: 'button', label: 'اكتشف القصة ←', url: 'stories.html' },
            { t: 'signoff' },
          ],
        },
      },
    },

    {
      key: 'blank',
      name: 'Start from scratch',
      desc: 'An empty email with the Hikaya header and footer.',
      audience: { segment: 'all' },
      content: {
        en: { subject: '', preheader: '', blocks: [{ t: 'heading', text: '' }, { t: 'text', text: 'Hi {{first_name}},\n\n' }, { t: 'button', label: 'Browse the stories →', url: 'stories.html' }, { t: 'signoff' }] },
        ar: { subject: '', preheader: '', blocks: [{ t: 'heading', text: '' }, { t: 'text', text: 'مرحبًا {{first_name}}،\n\n' }, { t: 'button', label: 'تصفّح القصص ←', url: 'stories.html' }, { t: 'signoff' }] },
      },
    },
  ];

  /* Brand photos that work in email (JPG, so Outlook shows them too). */
  window.HK_CRM_PHOTOS = [
    ['hero-bedroom-wide.jpg', 'Child reading in bedroom'], ['giftbox-open-pair.jpg', 'Gift box, open'],
    ['book-flatlay.jpg', 'Book cover'], ['child-reading-closeup.jpg', 'Child reading close-up'],
    ['giftbag-set.jpg', 'Gift bag set'], ['bunny-card-books.jpg', 'Bunny with books'],
    ['giftbox-closeup.jpg', 'Gift box close-up'], ['note-card-closeup.jpg', 'Note card'],
    ['bookshelf-scene.jpg', 'Bookshelf'], ['fantasy-night-scene.jpg', 'Night scene'],
  ].map(([f, label]) => ({ url: 'images/' + f, label }));
})();

/* Hikaya — "Try your child's cover free" landing page (hikaya/free-cover-preview.html), Nov 2026. EN + AR.
   Public SEO page that explains the free cover preview and sends parents into the existing flow (cover-preview.html).
   The Arabic copy is also served in the page's HTML on ?lang=ar (tools/seo/gen_ar_seo.js).
   Arabic carries no full stops (brand rule). Facts here must match terms.html / privacy.html (#cover-preview) and region.js. */
(function () {
  const T = window.HIKAYA_TRANSLATIONS = window.HIKAYA_TRANSLATIONS || {};
  T.fcp = {
    crumb: { en: 'Free cover preview', ar: 'معاينة الغلاف المجانية' },
    eyebrow: { en: 'Free · No payment needed', ar: 'مجانًا · دون أي دفع' },
    h1: { en: 'Try Your Child’s Personalised Book Cover Free', ar: 'جرّب غلاف قصة طفلك مجاناً' },
    lede: {
      en: 'Upload one photo and see your child’s name and face on a real Hikaya storybook cover in about a minute, before you order anything. It’s free, private and needs no payment.',
      ar: 'ارفع صورة واحدة وشاهد اسم طفلك ووجهه على غلاف حقيقي من قصص حكاية خلال دقيقة تقريبًا، قبل أن تطلب أي شيء، مجانًا وبخصوصية تامة ودون أي دفع',
    },
    cta: { en: 'Create my free cover preview', ar: 'أنشئ معاينة الغلاف مجانًا' },
    cta_sub: { en: 'Ready in about a minute', ar: 'جاهزة خلال دقيقة تقريبًا' },
    f_free: { en: 'Free, no card needed', ar: 'مجانية ودون بطاقة دفع' },
    f_noorder: { en: 'No obligation to order', ar: 'دون أي التزام بالطلب' },
    f_private: { en: 'Photo deleted within 48 hours', ar: 'تُحذف الصورة خلال 48 ساعة' },
    hero_alt: { en: 'Sample Hikaya storybook cover with the hero child illustrated on the front', ar: 'غلاف قصة نموذجي من حكاية يظهر عليه الطفل البطل' },

    how_h: { en: 'How it works', ar: 'كيف تعمل المعاينة' },
    s1_t: { en: 'Choose a story', ar: 'اختر قصة' },
    s1_d: { en: 'Pick one of our stories for ages 2 to 8, from bedtime adventures to Christmas and new-sibling stories.', ar: 'اختر واحدة من قصصنا للأعمار من 2 إلى 8 سنوات، من مغامرات ما قبل النوم إلى قصص الكريسماس وقدوم مولود جديد' },
    s2_t: { en: 'Enter their name', ar: 'اكتب اسم طفلك' },
    s2_d: { en: 'Type your child’s first name and age, and choose an English or Arabic cover.', ar: 'اكتب الاسم الأول لطفلك وعمره، واختر غلافًا بالعربية أو الإنجليزية' },
    s3_t: { en: 'Upload one photo', ar: 'ارفع صورة واحدة' },
    s3_d: { en: 'One clear photo with only your child in it and their face easy to see.', ar: 'صورة واحدة واضحة يظهر فيها طفلك وحده ووجهه واضح' },
    s4_t: { en: 'See their cover', ar: 'شاهد غلافه' },
    s4_d: { en: 'In about a minute your child appears as the hero on the cover, with their name in the title.', ar: 'خلال دقيقة تقريبًا يظهر طفلك بطلًا على الغلاف واسمه في عنوان القصة' },

    points_aria: { en: 'No payment, privacy and delivery', ar: 'دون دفع والخصوصية والتوصيل' },
    pay_h: { en: 'No payment needed', ar: 'دون أي دفع' },
    pay_d: { en: 'The cover preview is completely free. You don’t add a card, you don’t pay anything, and you don’t have to order afterwards. It’s simply a way to see your child as the hero before you decide.', ar: 'معاينة الغلاف مجانية بالكامل، لا تضيف بطاقة ولا تدفع أي شيء ولا يلزمك الطلب بعدها، إنها ببساطة طريقة لترى طفلك بطلًا للقصة قبل أن تقرر' },
    priv_h: { en: 'Your child’s photo stays private', ar: 'صورة طفلك تبقى خاصة' },
    priv_d: { en: 'The photo is used only to make your preview. It is never published, never sold and never used to train AI models, and the photo and the preview are deleted automatically within 48 hours. Only you see the result.', ar: 'تُستخدم الصورة لإنشاء معاينتك فقط، ولا تُنشر أبدًا ولا تُباع ولا تُستخدم لتدريب نماذج الذكاء الاصطناعي، وتُحذف الصورة والمعاينة تلقائيًا خلال 48 ساعة، ولا يرى النتيجة أحد غيرك' },
    priv_link: { en: 'Read how we protect photos', ar: 'اقرأ كيف نحمي الصور' },
    book_h: { en: 'Love it? Order the real book', ar: 'أعجبتك؟ اطلب الكتاب الحقيقي' },
    book_d: { en: 'Your finished book is a printed hardcover with your child as the hero, in English or Arabic, and your own message on the first page. The preview is a quick AI sample; the cover in your book is illustrated with more care and detail.', ar: 'كتابك النهائي مطبوع بغلاف مقوّى ويكون طفلك بطله، بالعربية أو الإنجليزية، مع رسالتك الخاصة في الصفحة الأولى، والمعاينة عيّنة سريعة بالذكاء الاصطناعي أما غلاف كتابك فيُرسم بعناية وتفاصيل أكثر' },
    b_hard: { en: 'Printed hardcover, 21×21 cm', ar: 'غلاف مقوّى مطبوع بمقاس 21×21 سم' },
    b_box: { en: 'Arrives gift-boxed in Hikaya packaging', ar: 'يصل في علبة هدية من حكاية' },
    b_uae: { en: 'Free delivery across the UAE, about 5 working days', ar: 'توصيل مجاني في جميع أنحاء الإمارات خلال نحو 5 أيام عمل' },
    b_gcc: { en: 'Delivery across the GCC, about 7 working days', ar: 'التوصيل إلى دول الخليج خلال نحو 7 أيام عمل' },

    samples_h: { en: 'Sample covers', ar: 'أغلفة نموذجية' },
    samples_d: { en: 'Example covers shown with our sample character. Your preview shows your child instead.', ar: 'أغلفة نموذجية تظهر فيها شخصيتنا التوضيحية، وفي معاينتك يظهر طفلك مكانها' },
    t_door: { en: 'Door of a Thousand Stars', ar: 'باب الألف نجمة' },
    t_rescue: { en: 'To the Rescue!', ar: 'إلى الإنقاذ!' },
    t_safari: { en: 'Grandpa’s Wild Safari', ar: 'رحلة السفاري البرية مع الجد' },
    t_star: { en: 'The Christmas Star That Went Missing', ar: 'نجمة الميلاد التي ضاعت' },
    alt_door: { en: 'Sample cover: Door of a Thousand Stars', ar: 'غلاف نموذجي: باب الألف نجمة' },
    alt_rescue: { en: 'Sample cover: To the Rescue!', ar: 'غلاف نموذجي: إلى الإنقاذ!' },
    alt_safari: { en: "Sample cover: Grandpa's Wild Safari", ar: 'غلاف نموذجي: رحلة السفاري البرية مع الجد' },
    alt_star: { en: 'Sample cover: The Christmas Star That Went Missing', ar: 'غلاف نموذجي: نجمة الميلاد التي ضاعت' },
    samples_more: { en: 'Browse all stories', ar: 'تصفّح جميع القصص' },

    faq_h: { en: 'Questions about the free cover preview', ar: 'أسئلة عن معاينة الغلاف المجانية' },
    q_free: { en: 'Is the cover preview free?', ar: 'هل معاينة الغلاف مجانية؟' },
    a_free: { en: 'Yes, completely. Creating a cover preview costs nothing and you don’t need a card or any payment.', ar: 'نعم، مجانية بالكامل، إنشاء معاينة الغلاف لا يكلّف شيئًا ولا تحتاج إلى بطاقة أو أي دفع' },
    q_order: { en: 'Do I need to order after creating it?', ar: 'هل يجب أن أطلب الكتاب بعد إنشاء المعاينة؟' },
    a_order: { en: 'No. The preview comes with no obligation. If you love it, you can order the book straight from the preview page and your child’s details carry over for that visit.', ar: 'لا، المعاينة دون أي التزام، وإن أعجبتك يمكنك طلب الكتاب مباشرة من صفحة المعاينة وتنتقل بيانات طفلك معك خلال تلك الزيارة' },
    q_private: { en: 'Is my child’s photo private?', ar: 'هل صورة طفلي تبقى خاصة؟' },
    a_private: { en: 'Yes. The photo is used only to make your preview. It is never published or sold, never used to train AI models, and it is deleted automatically within 48 hours together with the preview.', ar: 'نعم، تُستخدم الصورة لإنشاء معاينتك فقط، ولا تُنشر ولا تُباع ولا تُستخدم لتدريب نماذج الذكاء الاصطناعي، وتُحذف تلقائيًا مع المعاينة خلال 48 ساعة' },
    q_delivery: { en: 'How long does delivery take?', ar: 'كم يستغرق التوصيل؟' },
    a_delivery: { en: 'If you order the book, delivery takes about 5 working days in the UAE and about 7 working days in the rest of the GCC. Delivery is free across the UAE.', ar: 'عند طلب الكتاب يستغرق التوصيل نحو 5 أيام عمل في الإمارات ونحو 7 أيام عمل في باقي دول الخليج، والتوصيل مجاني في جميع أنحاء الإمارات' },

    final_h: { en: 'See them as the hero, free', ar: 'شاهد طفلك بطلًا للقصة مجانًا' },
    final_d: { en: 'One photo, about a minute, no payment.', ar: 'صورة واحدة ودقيقة تقريبًا ودون أي دفع' },
    more_h: { en: 'Explore Hikaya', ar: 'اكتشف حكاية' },
  };
})();

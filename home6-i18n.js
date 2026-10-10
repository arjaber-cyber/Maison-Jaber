/* Hikaya — homepage (2026 redesign) translations.
   Loaded after i18n.js; merges a `home6` namespace into HIKAYA_TRANSLATIONS.
   EN + AR only for the GCC launch (DE falls back to EN automatically). */
(function () {
  const T = window.HIKAYA_TRANSLATIONS = window.HIKAYA_TRANSLATIONS || {};
  T.home6 = {
    skip: { en: 'Skip to content', ar: 'انتقل إلى المحتوى' },

    // Utility bar ({country} and {fee} are filled in by home6.js)
    del_uae: { en: 'Free delivery across the UAE', ar: 'توصيل مجاني لجميع أنحاء الإمارات' },
    del_gcc: { en: 'Delivery to {country}: {fee}. Free on 2 or more books', ar: 'التوصيل إلى {country}: {fee}، مجاني عند طلب كتابين أو أكثر' },

    nav_stories: { en: 'Stories', ar: 'القصص' },
    nav_ages: { en: 'Age Groups', ar: 'الفئات العمرية' },
    nav_world: { en: 'Our World', ar: 'عالمنا' },
    nav_home: { en: 'Home', ar: 'الرئيسية' },
    nav_about: { en: 'Our Story', ar: 'قصتنا' },
    nav_faq: { en: 'FAQs', ar: 'الأسئلة الشائعة' },
    nav_account: { en: 'Account', ar: 'حسابي' },

    cta_create: { en: 'Create Their Story', ar: 'أنشئ قصتهم' },
    cta_explore: { en: 'Explore Stories', ar: 'تصفّح القصص' },

    // Hero
    hero_h1: { en: 'Their name.<br>Their story.<br>A memory they\'ll keep.', ar: 'اسمهم<br>قصتهم<br>ذكرى تبقى معهم' },
    hero_sub: { en: 'Personalised hardcover storybooks with your child at the heart of the adventure. You choose the story, we make it theirs, then print it, gift-box it and deliver it.', ar: 'كتب قصص بغلاف فاخر يكون طفلك فيها بطل المغامرة، أنت تختار القصة، ونحن نجعلها له، ثم نطبعها ونغلّفها في علبة هدية ونوصلها إليك' },
    hero_alt: { en: 'A child reading her personalised Hikaya hardcover, with her name on the cover', ar: 'طفلة تقرأ كتاب حكاية المخصّص لها واسمها على الغلاف' },
    fact_hardcover: { en: 'Premium hardcover', ar: 'غلاف مقوّى فاخر' },
    fact_child: { en: 'Your child as the hero', ar: 'طفلك هو البطل' },
    fact_box: { en: 'Gift box included', ar: 'علبة الهدية مشمولة' },
    price_from: { en: 'Each book', ar: 'سعر الكتاب' },
    inset_t: { en: 'Arrives ready to give', ar: 'يصل جاهزًا للإهداء' },
    inset_s: { en: 'Every book comes in our signature Hikaya gift box.', ar: 'كل كتاب يصل في علبة هدايا حكاية المميزة' },

    // Journey
    how_title: { en: 'How their story comes to life', ar: 'كيف تولد قصتهم' },
    how_sub: { en: 'Choose an adventure, tell us about your child, and we create a story made especially for them.', ar: 'اختر مغامرة، وأخبرنا عن طفلك، ونصنع قصة خاصة به وحده' },
    s1_t: { en: 'Choose their story', ar: 'اختر قصتهم' },
    s1_d: { en: 'Explore our collection and pick the adventure, theme or moment that feels right for your child.', ar: 'تصفّح مجموعتنا واختر المغامرة أو الموضوع أو اللحظة الأنسب لطفلك' },
    s2_t: { en: 'Make it theirs', ar: 'اجعلها لهم' },
    s2_d: { en: 'Add your child\'s name, age and a photo, so we can place them inside the story.', ar: 'أضف اسم طفلك وعمره وصورته، لنضعه داخل القصة' },
    f_name: { en: 'Child\'s first name', ar: 'اسم الطفل' },
    f_age: { en: 'Age', ar: 'العمر' },
    f_photo: { en: 'Photo', ar: 'الصورة' },
    f_photo_ok: { en: 'Photo added', ar: 'تمت إضافة الصورة' },
    f_photo_del: { en: 'Deleted after 15 days', ar: 'تُحذف بعد 15 يومًا' },
    f_next: { en: 'Next', ar: 'التالي' },
    chip_age: { en: 'Age 5', ar: 'العمر 5' },
    chip_photo: { en: 'Photo', ar: 'الصورة' },
    s3_t: { en: 'We create their story', ar: 'نصنع قصتهم' },
    s3_d: { en: 'We bring the story together with your child at the centre of the adventure.', ar: 'نجمع القصة ويكون طفلك في قلب المغامرة' },
    s4_t: { en: 'We print, pack and deliver', ar: 'نطبع ونغلّف ونوصل' },
    s4_d: { en: 'Their story is printed as a hardcover book, packed in our signature gift box and delivered ready for their moment.', ar: 'تُطبع قصتهم في كتاب بغلاف مقوّى، وتُغلّف في علبة الهدايا المميزة، وتصل جاهزة للحظتهم الخاصة' },
    s4_alt: { en: 'An open Hikaya gift box with cream tissue and a gold star seal', ar: 'علبة هدايا حكاية مفتوحة مع ورق ناعم وختم نجمة ذهبية' },
    privacy: { en: 'Your child\'s photo is only used to create their book, and is deleted after 15 days.', ar: 'تُستخدم صورة طفلك لصنع كتابه فقط، وتُحذف بعد 15 يومًا' },

    // Shelves
    new_title: { en: 'Their next adventure', ar: 'مغامرتهم القادمة' },
    new_sub: { en: 'Fresh stories for little personalities, big feelings and everyday adventures.', ar: 'قصص جديدة لشخصيات صغيرة ومشاعر كبيرة ومغامرات كل يوم' },
    ages_label: { en: 'Stories for ages', ar: 'قصص للأعمار' },
    view_all: { en: 'View all stories', ar: 'كل القصص' },
    best_title: { en: 'Best sellers', ar: 'الأكثر طلبًا' },
    best_sub: { en: 'Stories families keep coming back to.', ar: 'قصص تعود إليها العائلات مرة بعد مرة' },
    ages: { en: 'Ages', ar: 'الأعمار' },
    sample_cover: { en: 'Sample cover', ar: 'غلاف تجريبي' },
    name_slot: { en: 'Name', ar: 'الاسم' },

    // Themes (story "moments")
    th_confidence: { en: 'Confidence', ar: 'الثقة' },
    th_new: { en: 'New things', ar: 'تجارب جديدة' },
    th_adventure: { en: 'Adventure', ar: 'مغامرة' },
    th_bedtime: { en: 'Bedtime', ar: 'وقت النوم' },
    th_kindness: { en: 'Kindness', ar: 'اللطف' },
    th_courage: { en: 'Courage', ar: 'الشجاعة' },
    th_change: { en: 'Change', ar: 'التغيير' },
    th_honesty: { en: 'Honesty', ar: 'الصدق' },
    th_friendship: { en: 'Friendship', ar: 'الصداقة' },
    th_screen: { en: 'Screen time', ar: 'وقت الشاشة' },
    th_family: { en: 'Family', ar: 'العائلة' },
    th_responsibility: { en: 'Responsibility', ar: 'المسؤولية' },
    th_growing: { en: 'Growing up', ar: 'النمو' },

    // Packaging
    pkg_title: { en: 'Every story arrives ready to feel special', ar: 'كل قصة تصل وكأنها هدية' },
    pkg_sub: { en: 'Every Hikaya book comes in our signature gift packaging, because opening their story should feel as special as reading it.', ar: 'كل كتاب من حكاية يصل في تغليف الهدايا المميز، لأن فتح قصتهم يجب أن يكون مميزًا كقراءتها' },
    pkg_1: { en: 'Their personalised hardcover', ar: 'كتابهم المخصّص بغلاف مقوّى' },
    pkg_2: { en: 'Rigid cream keepsake box', ar: 'علبة تذكارية متينة بلون كريمي' },
    pkg_3: { en: 'Satin ribbon and Hikaya tag', ar: 'شريط ساتان وبطاقة حكاية' },
    pkg_4: { en: 'Tissue sealed with our gold star', ar: 'ورق ناعم مختوم بنجمتنا الذهبية' },
    pkg_5: { en: 'Included with every order, at no extra cost', ar: 'مشمول مع كل طلب دون أي تكلفة إضافية' },
    pkg_direct: { en: 'Giving it to someone else? We can deliver it straight to them, gift-boxed.', ar: 'تهديه لشخص آخر؟ يمكننا توصيله إليه مباشرة في علبة الهدية' },
    pkg_alt: { en: 'The Hikaya gift box opened, showing cream tissue sealed with a gold star, beside the ribbon-tied closed box', ar: 'علبة حكاية مفتوحة مع ورق ناعم مختوم بنجمة ذهبية بجانب العلبة المغلقة بالشريط' },
    pkg2_alt: { en: 'Close-up of a Hikaya card beside the ribbon-tied box', ar: 'بطاقة حكاية بجانب العلبة المربوطة بالشريط' },
    pkg3_alt: { en: 'Hikaya packaging with tissue and gold star seal', ar: 'تغليف حكاية مع الورق الناعم وختم النجمة الذهبية' },

    // Reviews (PLACEHOLDERS — replace before launch)
    rev_title: { en: 'Loved by little readers, and their parents', ar: 'يحبها القرّاء الصغار، وأهاليهم أيضًا' },
    rev_hand: { en: 'Made just for them ♡', ar: 'صُنعت لهم وحدهم ♡' },
    rev_alt: { en: 'Hikaya storybooks stacked beside a soft toy and a note card', ar: 'كتب حكاية بجانب دمية ناعمة وبطاقة' },
    r1: { en: 'She asked for “her book” every night for a week, and kept pointing at her own name.', ar: 'طلبت «كتابها» كل ليلة لأسبوع كامل، وكانت تشير إلى اسمها كل مرة' },
    r1_who: { en: 'Layla\'s mum, Dubai', ar: 'والدة ليلى، دبي' },
    r2: { en: 'The box alone made his birthday. The book itself is properly made. It will last.', ar: 'العلبة وحدها صنعت عيد ميلاده، والكتاب نفسه متقن الصنع وسيدوم طويلًا' },
    r2_who: { en: 'Omar\'s dad, Abu Dhabi', ar: 'والد عمر، أبوظبي' },
    r3: { en: 'We sent it straight to my niece in Riyadh. She recognised herself before she could read the title.', ar: 'أرسلناه مباشرة إلى ابنة أختي في الرياض، تعرّفت على نفسها قبل أن تقرأ العنوان' },
    r3_who: { en: 'Noor, Sharjah', ar: 'نور، الشارقة' },

    // Our story
    why_t1: { en: 'More than a book.', ar: 'أكثر من كتاب' },
    why_t2: { en: 'A story they can see themselves in.', ar: 'قصة يرون أنفسهم فيها' },
    why_p: { en: 'Children connect differently when they recognise themselves inside a story. Hikaya puts your child on the page, so they can see themselves as', ar: 'يتفاعل الأطفال بشكل مختلف عندما يرون أنفسهم داخل القصة، حكاية تضع طفلك على الصفحة ليرى نفسه' },
    tr_brave: { en: 'brave', ar: 'شجاعًا' },
    tr_capable: { en: 'capable', ar: 'قادرًا' },
    tr_curious: { en: 'curious', ar: 'فضوليًا' },
    tr_kind: { en: 'kind', ar: 'لطيفًا' },
    tr_confident: { en: 'confident', ar: 'واثقًا' },
    tr_imaginative: { en: 'imaginative', ar: 'مبدعًا' },
    why_themes: { en: 'Our stories cover real childhood moments: courage, big emotions, screen time, responsibility, family, friendship, change, growing up and imagination.', ar: 'تتناول قصصنا لحظات حقيقية من الطفولة: الشجاعة، والمشاعر الكبيرة، ووقت الشاشة، والمسؤولية، والعائلة، والصداقة، والتغيير، والنمو، والخيال' },
    why_cta: { en: 'Our story', ar: 'قصتنا' },
    why_alt: { en: 'A shelf of Hikaya storybooks with an open book on the desk', ar: 'رف من كتب حكاية مع كتاب مفتوح على المكتب' },

    // Final CTA
    final_title: { en: 'Every child has a story. Let\'s make theirs.', ar: 'لكل طفل قصة، لنصنع قصته' },
    final_sub: { en: 'Pick a story, add their name, age and photo. We\'ll take it from there.', ar: 'اختر قصة، وأضف الاسم والعمر والصورة، والباقي علينا' },
    final_hand: { en: 'Their story starts here.', ar: 'قصتهم تبدأ من هنا' },
    final_alt: { en: 'A Hikaya book and card on a warm desk', ar: 'كتاب وبطاقة من حكاية على مكتب دافئ' },

    // Footer
    foot_about: { en: 'Personalised hardcover storybooks, made for one child at a time and delivered gift-boxed across the UAE and GCC.', ar: 'كتب قصص مخصّصة بغلاف مقوّى، تُصنع لكل طفل على حدة وتصل في علبة هدية إلى الإمارات ودول الخليج' },
    foot_explore: { en: 'Explore', ar: 'استكشف' },
    foot_help: { en: 'Help', ar: 'المساعدة' },
    foot_track: { en: 'Track your order', ar: 'تتبّع طلبك' },
    foot_contact: { en: 'Contact us', ar: 'تواصل معنا' },
    foot_refund: { en: 'Returns and refunds', ar: 'الإرجاع والاسترداد' },
    foot_account: { en: 'Your account', ar: 'حسابك' },
    foot_signin: { en: 'Sign in', ar: 'تسجيل الدخول' },
    foot_cart: { en: 'Cart', ar: 'السلة' },
    foot_privacy: { en: 'Privacy', ar: 'الخصوصية' },
    foot_terms: { en: 'Terms', ar: 'الشروط' },
    foot_copy: { en: '© 2026 Maison Jaber. All rights reserved.', ar: '© 2026 ميزون جابر، جميع الحقوق محفوظة' },
  };

  // --- v2 (matches approved mockup) ---
  T.home6.hero_sub = { en: "Beautifully crafted personalised storybooks that place your child at the heart of the adventure.", ar: "كتب قصص مخصّصة مصنوعة بعناية، تضع طفلك في قلب المغامرة" };
  T.home6.hero_hand = { en: "Little stories. Big memories.", ar: "قصص صغيرة، ذكريات كبيرة" };
  T.home6.how_title = { en: "From a story to their story.", ar: "من قصة… إلى قصتهم" };
  T.home6.s1_alt = { en: "Hikaya storybooks on a shelf, ready to choose from", ar: "كتب حكاية على الرف جاهزة للاختيار" };
  T.home6.s4_t = { en: "Printed, packed and delivered", ar: "نطبع ونغلّف ونوصل" };
  T.home6.s4_d = { en: "Printed as a hardcover book, packed in our signature gift box and delivered ready for their moment.", ar: "تُطبع في كتاب بغلاف مقوّى، وتُغلّف في علبة الهدايا المميزة، وتصل جاهزة للحظتهم" };
  T.home6.f_title = { en: "Tell us about your child", ar: "أخبرنا عن طفلك" };
  T.home6.new_title = { en: "Their Next Adventure", ar: "مغامرتهم القادمة" };
  T.home6.view_all = { en: "View all", ar: "عرض الكل" };
  T.home6.best_title = { en: "Best Sellers", ar: "الأكثر طلبًا" };
  T.home6.pkg_title = { en: "Beautiful from story to doorstep.", ar: "جميلة من القصة حتى باب البيت" };
  T.home6.pkg_sub = { en: "Every Hikaya book comes beautifully presented in our signature gift packaging.", ar: "كل كتاب من حكاية يصل بتغليف الهدايا المميز الخاص بنا" };
  T.home6.pkg_direct = { en: "Giving it to someone else? We can deliver it straight to them.", ar: "تهديه لشخص آخر؟ يمكننا توصيله إليه مباشرة" };
  T.home6.pkg_alt = { en: "The Hikaya gift box tied with a caramel satin ribbon and a Hikaya tag", ar: "علبة هدايا حكاية مربوطة بشريط ساتان وبطاقة حكاية" };
  T.home6.rev_title = { en: "Real stories. Real reactions.", ar: "قصص حقيقية. ردود فعل حقيقية" };
  T.home6.r1_who = { en: "Amira's mum", ar: "والدة أميرة" };
  T.home6.r1_city = { en: "Dubai", ar: "دبي" };
  T.home6.r2_who = { en: "Omar's dad", ar: "والد عمر" };
  T.home6.r2_city = { en: "Abu Dhabi", ar: "أبوظبي" };
  T.home6.r3_who = { en: "Lela's mum", ar: "والدة ليلى" };
  T.home6.r3_city = { en: "Sharjah", ar: "الشارقة" };
  T.home6.why_more = { en: "More", ar: "أكثر" };
  T.home6.why_t1 = { en: "than a book.", ar: "من كتاب" };
  T.home6.why_p = { en: "Every Hikaya story helps children see themselves as brave, kind, curious and capable, through real moments like big feelings, screen time, family, friendship and growing up.", ar: "كل قصة من حكاية تساعد الأطفال على رؤية أنفسهم شجعانًا ولطفاء وفضوليين وقادرين، من خلال لحظات حقيقية مثل المشاعر الكبيرة ووقت الشاشة والعائلة والصداقة والنمو" };
  T.home6.why_cta = { en: "Our Story", ar: "قصتنا" };
  T.home6.why_alt = { en: "A child in bed reading her Hikaya book, with the gift box beside her", ar: "طفلة في سريرها تقرأ كتاب حكاية وبجانبها علبة الهدية" };
  T.home6.final_title = { en: "Every child has a story.<br>Let's make theirs unforgettable.", ar: "لكل طفل قصة<br>لنجعل قصته لا تُنسى" };
  T.home6.final_alt = { en: "A child sitting outdoors with her soft toy, looking out over a glowing city", ar: "طفلة تجلس في الخارج مع دميتها وتنظر إلى مدينة مضيئة" };
  T.home6.foot_story = { en: "Hikaya", ar: "حكاية" };
  T.home6.foot_how = { en: "How it works", ar: "كيف تعمل" };
  T.home6.foot_search = { en: "Search", ar: "البحث" };

  T.home6.s3_alt = { en: "A personalised Hikaya hardcover with the child's name and portrait on the cover", ar: 'كتاب حكاية مخصّص يحمل اسم الطفل وصورته على الغلاف' };

  // Country names for the region switcher / delivery bar
  T.home6_regions = {
    UAE: { en: 'UAE', ar: 'الإمارات' },
    Saudi: { en: 'Saudi Arabia', ar: 'السعودية' },
    Qatar: { en: 'Qatar', ar: 'قطر' },
    Kuwait: { en: 'Kuwait', ar: 'الكويت' },
    Bahrain: { en: 'Bahrain', ar: 'البحرين' },
    Oman: { en: 'Oman', ar: 'عُمان' },
  };
})();

/* Oct 2026: photo→illustration reveal, shop by occasion, WhatsApp help (no full stops in Arabic copy). */
(function () {
  const T = window.HIKAYA_TRANSLATIONS = window.HIKAYA_TRANSLATIONS || {};
  T.rvl = {
    kicker: { en: 'The Hikaya moment', ar: 'لحظة حكاية' },
    title: { en: 'One photo. Their very own storybook.', ar: 'صورة واحدة، وقصة خاصة بهم' },
    sub: { en: 'Share one clear photo and we illustrate your child as the hero, recognisably them, on every page of their book.', ar: 'شارك صورة واضحة واحدة، وسنرسم طفلك بطلًا للقصة، يشبهه تمامًا، في كل صفحة من كتابه' },
    hint: { en: 'Drag to reveal', ar: 'اسحب لترى التحوّل' },
    photo: { en: 'Your photo', ar: 'صورتك' },
    book: { en: 'In their book', ar: 'في كتابه' },
    slider: { en: 'Compare the photo with the illustrated page', ar: 'قارن الصورة بالرسم في الكتاب' },
    p1: { en: 'Name, age and one photo, that’s all we need', ar: 'الاسم والعمر وصورة واحدة، هذا كل ما نحتاجه' },
    p2: { en: 'Your child’s photo stays private', ar: 'صورة طفلك تبقى خاصة' },
    p3: { en: 'Printed as a keepsake hardcover', ar: 'يُطبع كتابًا فاخرًا بغلاف مقوّى يدوم للذكرى' },
    alt_photo: { en: 'A photo of a smiling girl with curly hair', ar: 'صورة لطفلة مبتسمة بشعر مجعّد' },
    alt_book: { en: 'The same girl illustrated on the cover of her Hikaya book', ar: 'الطفلة نفسها مرسومة على غلاف كتابها من حكاية' },
    note: { en: 'Example shown with a sample photo', ar: 'المثال المعروض بصورة توضيحية' },
  };
  T.occ = {
    title: { en: 'Find the perfect gift', ar: 'اختر الهدية المناسبة' },
    sub: { en: 'A story made for one child, for the moments you want them to remember.', ar: 'قصة مصنوعة لطفل واحد، للحظات التي تريده أن يتذكرها' },
    shop: { en: 'Shop by occasion', ar: 'تسوّق حسب المناسبة' },
    birthday: { en: 'Birthday', ar: 'عيد الميلاد' },
    birthday_d: { en: 'A gift with their name on every page', ar: 'هدية تحمل اسمه في كل صفحة' },
    eid: { en: 'Eid & Ramadan', ar: 'العيد ورمضان' },
    eid_d: { en: 'An Eidiya they’ll keep for years', ar: 'عيدية تبقى معهم سنوات' },
    christmas: { en: 'Christmas', ar: 'الكريسماس' },
    christmas_d: { en: 'The story they’ll ask for every night', ar: 'القصة التي سيطلبونها كل ليلة' },
    newbaby: { en: 'New baby', ar: 'مولود جديد' },
    newbaby_d: { en: 'For big brothers and big sisters', ar: 'للأخ الأكبر والأخت الكبرى' },
    school: { en: 'First day of school', ar: 'أول يوم في المدرسة' },
    school_d: { en: 'Courage for new beginnings', ar: 'شجاعة للبدايات الجديدة' },
    justbecause: { en: 'Just because', ar: 'بلا مناسبة' },
    justbecause_d: { en: 'Because every child deserves their story', ar: 'لأن كل طفل يستحق قصته' },
    banner: { en: 'Gifts for {occasion}', ar: 'هدايا {occasion}' },
    banner_d: { en: 'Every story arrives gift-boxed, and we can deliver straight to the child. Add a gift message at checkout.', ar: 'تصل كل قصة في علبة هدية، ويمكننا توصيلها مباشرة إلى الطفل، وأضف رسالة الإهداء عند الدفع' },
    all: { en: 'See all occasions', ar: 'كل المناسبات' },
    clear: { en: 'Show all stories', ar: 'عرض كل القصص' },
    f_all: { en: 'All occasions', ar: 'كل المناسبات' },
    f_label: { en: 'Occasion', ar: 'المناسبة' },
  };
  T.wa = {
    btn: { en: 'Chat on WhatsApp', ar: 'تواصل عبر واتساب' },
    short: { en: 'Need help?', ar: 'تحتاج مساعدة؟' },
    msg: { en: 'Hi Hikaya, I have a question', ar: 'مرحبًا حكاية، لدي سؤال' },
    msg_page: { en: 'Hi Hikaya, I have a question about {page}', ar: 'مرحبًا حكاية، لدي سؤال عن {page}' },
    label: { en: 'WhatsApp', ar: 'واتساب' },
    hours: { en: 'A real person replies, usually within a few hours', ar: 'يرد عليك شخص حقيقي، عادةً خلال ساعات قليلة' },
  };
})();

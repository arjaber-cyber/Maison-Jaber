/* Hikaya — page copy for the 2026 redesign (everything except the homepage). EN + AR. */
(function () {
  const T = window.HIKAYA_TRANSLATIONS = window.HIKAYA_TRANSLATIONS || {};
  T.pg = {
    // Stories collection
    col_title: { en: 'Find their next story.', ar: 'اعثر على قصتهم القادمة' },
    col_sub: { en: 'Explore adventures created around childhood moments, big feelings and little milestones.', ar: 'استكشف مغامرات صُنعت حول لحظات الطفولة والمشاعر الكبيرة والإنجازات الصغيرة' },
    f_age: { en: 'Age', ar: 'العمر' },
    f_all_ages: { en: 'All ages', ar: 'كل الأعمار' },
    f_theme: { en: 'Theme', ar: 'الموضوع' },
    f_all_themes: { en: 'All themes', ar: 'كل المواضيع' },
    f_sort: { en: 'Sort by', ar: 'ترتيب حسب' },
    s_featured: { en: 'Featured', ar: 'المميزة' },
    s_newest: { en: 'Newest', ar: 'الأحدث' },
    s_az: { en: 'A–Z', ar: 'أ–ي' },
    f_reset: { en: 'Clear filters', ar: 'مسح الفلاتر' },
    count: { en: '{n} stories', ar: 'عدد القصص: {n}' },
    count_one: { en: '1 story', ar: 'قصة واحدة' },
    empty_t: { en: 'No stories match these filters', ar: 'لا توجد قصص تطابق هذا الاختيار' },
    empty_d: { en: 'Try another age or theme, or clear the filters to see everything.', ar: 'جرّب عمرًا أو موضوعًا آخر، أو امسح الفلاتر لرؤية كل القصص' },
    help_t: { en: 'Not sure where to start?', ar: 'لا تعرف من أين تبدأ؟' },
    help_d: { en: 'Explore by age to find the right story for them.', ar: 'تصفّح حسب العمر لتجد القصة المناسبة لهم' },
    ages_2_4: { en: 'Ages 2–4', ar: 'من 2 إلى 4 سنوات' },
    ages_4_6: { en: 'Ages 4–6', ar: 'من 4 إلى 6 سنوات' },
    ages_6_8: { en: 'Ages 6–8', ar: 'من 6 إلى 8 سنوات' },

    // Theme groups
    tg_emotions: { en: 'Emotions', ar: 'المشاعر' },
    tg_emotions_d: { en: 'Big feelings, honesty and change', ar: 'المشاعر الكبيرة والصدق والتغيير' },
    tg_friendship: { en: 'Friendship', ar: 'الصداقة' },
    tg_friendship_d: { en: 'Kindness and joining in', ar: 'اللطف والمشاركة' },
    tg_confidence: { en: 'Confidence', ar: 'الثقة' },
    tg_confidence_d: { en: 'Courage and new things', ar: 'الشجاعة والتجارب الجديدة' },
    tg_everyday: { en: 'Everyday adventures', ar: 'مغامرات كل يوم' },
    tg_everyday_d: { en: 'Bedtime, family and big days out', ar: 'وقت النوم والعائلة والرحلات' },

    // Age group page
    age_title: { en: 'Stories for ages {band}', ar: 'قصص للأعمار {band}' },
    age_sub_2_4: { en: 'First words, cosy routines and big little feelings.', ar: 'كلمات أولى وروتين دافئ ومشاعر صغيرة كبيرة' },
    age_sub_4_6: { en: 'Big imaginations, growing independence and plenty of questions.', ar: 'خيال واسع واستقلالية تكبر وأسئلة لا تنتهي' },
    age_sub_6_8: { en: 'Stronger readers, bigger adventures and real-world lessons.', ar: 'قرّاء أقوى ومغامرات أكبر ودروس من الحياة' },
    age_pick: { en: 'Choose an age group', ar: 'اختر الفئة العمرية' },
    age_popular: { en: 'Popular in this age group', ar: 'الأكثر طلبًا في هذه الفئة' },
    age_quote_2_4: { en: 'At this age, children learn their world through rhythm, repetition and the people they love. Seeing themselves on the page makes every reading feel like theirs.', ar: 'في هذا العمر يتعرّف الأطفال على عالمهم من خلال الإيقاع والتكرار ومن يحبونهم، رؤية أنفسهم على الصفحة تجعل كل قراءة خاصة بهم' },
    age_quote_4_6: { en: 'At this age, children are beginning to explore independence, emotions and friendships. Being the hero lets them try out being brave.', ar: 'في هذا العمر يبدأ الأطفال باستكشاف الاستقلالية والمشاعر والصداقات، أن يكونوا الأبطال يمنحهم فرصة تجربة الشجاعة' },
    age_quote_6_8: { en: 'At this age, children want stories that take them seriously: real problems, real choices, and a hero who looks like them.', ar: 'في هذا العمر يريد الأطفال قصصًا تأخذهم بجدية: مشكلات حقيقية واختيارات حقيقية وبطلًا يشبههم' },
    age_browse: { en: 'Browse all ages {band}', ar: 'تصفّح كل قصص {band}' },

    // Story detail
    crumbs_stories: { en: 'Stories', ar: 'القصص' },
    incl_box: { en: 'Includes our signature gift packaging', ar: 'يشمل تغليف الهدايا المميز' },
    create_this: { en: 'Create This Story', ar: 'أنشئ هذه القصة' },
    bundle: { en: 'Ordering for siblings? 2 books get 10% off each and free delivery. 3 or more get 20% off.', ar: 'تطلب للإخوة؟ كتابان بخصم 10% لكل كتاب وتوصيل مجاني، و3 كتب أو أكثر بخصم 20%' },
    happens: { en: 'What happens in this story?', ar: 'ماذا يحدث في هذه القصة؟' },
    learns: { en: 'What your child learns', ar: 'ماذا يتعلم طفلك' },
    personalised: { en: 'What gets personalised', ar: 'ما الذي نخصّصه' },
    p_name: { en: "Your child's name", ar: 'اسم طفلك' },
    p_name_d: { en: 'Woven through the title and the story', ar: 'في العنوان وعلى امتداد القصة' },
    p_photo: { en: 'Their look', ar: 'ملامحهم' },
    p_photo_d: { en: 'Illustrated from the photo you share', ar: 'نرسمها من الصورة التي تشاركها' },
    p_pronouns: { en: 'Pronouns', ar: 'الضمائر' },
    p_pronouns_d: { en: 'So the story speaks about them the right way', ar: 'لتتحدث القصة عنهم بالشكل الصحيح' },
    p_dedication: { en: 'A dedication from you', ar: 'إهداء منك' },
    p_dedication_d: { en: 'Optional, printed inside the cover', ar: 'اختياري، يُطبع داخل الغلاف' },
    p_extra: { en: 'An extra character', ar: 'شخصية إضافية' },
    p_extra_d: { en: 'Optional: add {who} from a real photo', ar: 'اختياري: أضف {who} من صورة حقيقية' },
    inside: { en: 'Inside the book', ar: 'داخل الكتاب' },
    inside_note: { en: 'Sample pages. Your copy is illustrated with your child as the hero.', ar: 'صفحات نموذجية، نسختك مرسومة وطفلك بطل القصة' },
    included: { en: "What's included", ar: 'ماذا يتضمن' },
    inc_book: { en: 'Personalised hardcover', ar: 'كتاب مخصّص بغلاف مقوّى' },
    inc_print: { en: 'Premium print quality', ar: 'طباعة فاخرة' },
    inc_box: { en: 'Signature gift box', ar: 'علبة الهدايا المميزة' },
    inc_tissue: { en: 'Tissue and gold star seal', ar: 'ورق ناعم وختم النجمة الذهبية' },
    inc_ribbon: { en: 'Satin ribbon and tag', ar: 'شريط ساتان وبطاقة' },
    inc_delivery: { en: 'Delivered to your door', ar: 'توصيل حتى بابك' },
    also_love: { en: 'They may also love', ar: 'قد يحبون أيضًا' },
    pages: { en: '{n} pages', ar: '{n} صفحة' },
    not_found_t: { en: "We couldn't find that story", ar: 'لم نجد هذه القصة' },
    not_found_d: { en: 'It may have moved. Browse the full collection instead.', ar: 'ربما نُقلت، تصفّح المجموعة كاملة' },
    sib_title: { en: 'Add another story for a sibling?', ar: 'هل تضيف قصة أخرى للأخ أو الأخت؟' },
    // Order confirmation
    od_title: { en: "Their story is officially on its way.", ar: "قصتهم في طريقها إليكم رسميًا" },
    od_sub: { en: "Thank you for creating a Hikaya story for {name}.", ar: "شكرًا لك على صنع قصة من حكاية لـ{name}" },
    od_sub_plain: { en: "Thank you for creating a Hikaya story.", ar: "شكرًا لك على صنع قصة من حكاية" },
    od_number: { en: "Order number", ar: "رقم الطلب" },
    od_number_email: { en: "Sent to your email", ar: "أُرسل إلى بريدك" },
    od_eta: { en: "Estimated delivery", ar: "موعد التوصيل المتوقع" },
    od_eta_v: { en: "About a week", ar: "خلال أسبوع تقريبًا" },
    od_track: { en: "Track Your Order", ar: "تتبّع طلبك" },
    od_more: { en: "Explore More Stories", ar: "اكتشف المزيد من القصص" },
    // About, Our World, FAQ, Contact
    abt_title: { en: "Stories made to feel personal.", ar: "قصص صُنعت لتكون شخصية" },
    abt_sub: { en: "Hikaya means “story” in Arabic. We make storybooks where your child is the hero, so every page feels like it was written for them, because it was.", ar: "«حكاية» تعني القصة. نصنع كتب قصص يكون طفلك فيها البطل، لتشعر كل صفحة أنها كُتبت له، لأنها فعلًا كذلك" },
    abt_cta: { en: "Explore Stories", ar: "تصفّح القصص" },
    abt_why_t: { en: "Why Hikaya", ar: "لماذا حكاية" },
    abt_why_p: { en: "Children connect differently when they recognise themselves inside a story. We build every book around real childhood moments, from big feelings and screen time to friendship, family and growing up, and put your child at the centre of it.", ar: "يتفاعل الأطفال بشكل مختلف عندما يرون أنفسهم داخل القصة. نبني كل كتاب حول لحظات حقيقية من الطفولة، من المشاعر الكبيرة ووقت الشاشة إلى الصداقة والعائلة والنمو، ونضع طفلك في قلبها" },
    v_thoughtful: { en: "Thoughtful", ar: "مدروسة" },
    v_thoughtful_d: { en: "Stories about real moments in their lives", ar: "قصص عن لحظات حقيقية في حياتهم" },
    v_personal: { en: "Personal", ar: "شخصية" },
    v_personal_d: { en: "Their name, their look, their story", ar: "اسمهم وملامحهم وقصتهم" },
    v_made: { en: "Beautifully made", ar: "مصنوعة بإتقان" },
    v_made_d: { en: "A premium hardcover, gift-boxed", ar: "كتاب فاخر بغلاف مقوّى في علبة هدية" },
    v_keep: { en: "Made to keep", ar: "تبقى معهم" },
    v_keep_d: { en: "A book they'll come back to for years", ar: "كتاب يعودون إليه لسنوات" },
    abt_how_t: { en: "How we make each book", ar: "كيف نصنع كل كتاب" },
    abt_how_p: { en: "You choose the story and tell us about your child. We create their personalised version, print it as a hardcover and pack it in our signature gift box before it's delivered across the UAE and GCC.", ar: "تختار القصة وتخبرنا عن طفلك. نصنع نسخته المخصّصة، ونطبعها بغلاف مقوّى، ونغلّفها في علبة الهدايا المميزة قبل توصيلها في الإمارات ودول الخليج" },
    wld_title: { en: "Stories for real childhood moments.", ar: "قصص للحظات الطفولة الحقيقية" },
    wld_sub: { en: "From big feelings to everyday adventures, our stories are inspired by the moments that shape who they become.", ar: "من المشاعر الكبيرة إلى مغامرات كل يوم، قصصنا مستوحاة من اللحظات التي تشكّل من يصبحون" },
    w_courage: { en: "Courage", ar: "الشجاعة" },
    w_courage_d: { en: "Trying new things and finding out they're braver than they knew.", ar: "تجربة أشياء جديدة واكتشاف أنهم أشجع مما ظنّوا" },
    w_kindness: { en: "Kindness", ar: "اللطف" },
    w_kindness_d: { en: "Helping, sharing and joining in.", ar: "المساعدة والمشاركة واللعب مع الآخرين" },
    w_emotions: { en: "Emotions", ar: "المشاعر" },
    w_emotions_d: { en: "Big feelings, honesty and making things right.", ar: "المشاعر الكبيرة والصدق وإصلاح الأخطاء" },
    w_imagination: { en: "Imagination", ar: "الخيال" },
    w_imagination_d: { en: "Adventures that start in bed and end among the stars.", ar: "مغامرات تبدأ في السرير وتنتهي بين النجوم" },
    w_family: { en: "Family", ar: "العائلة" },
    w_family_d: { en: "Grandparents, siblings and the people who love them most.", ar: "الأجداد والإخوة ومن يحبونهم أكثر" },
    w_growing: { en: "Growing Up", ar: "النمو" },
    w_growing_d: { en: "Moving house, screen time and new routines.", ar: "الانتقال إلى بيت جديد ووقت الشاشة والعادات الجديدة" },
    wld_cta_t: { en: "Every story starts with your child.", ar: "كل قصة تبدأ بطفلك" },
    faq_title: { en: "Frequently asked questions", ar: "الأسئلة الشائعة" },
    faq_sub: { en: "Personalisation, delivery, photos and gifting. Can't find your answer? We're happy to help.", ar: "التخصيص والتوصيل والصور والهدايا، لم تجد إجابتك؟ يسعدنا مساعدتك" },
    faq_contact: { en: "Contact us", ar: "تواصل معنا" },
    fg_personal: { en: "Personalisation", ar: "التخصيص" },
    fg_delivery: { en: "Delivery and format", ar: "التوصيل والشكل" },
    fg_gifts: { en: "Gifts and orders", ar: "الهدايا والطلبات" },
    fg_privacy: { en: "Photos and privacy", ar: "الصور والخصوصية" },
    fg_language: { en: "Language", ar: "اللغة" },
    fq1: { en: "How does personalisation work?", ar: "كيف يعمل التخصيص؟" },
    fa1: { en: "Choose a story, then add your child's first name, age and a clear photo. We create the story with your child as the hero and print it as a hardcover book.", ar: "اختر قصة، ثم أضف اسم طفلك وعمره وصورة واضحة له، نصنع القصة ويكون طفلك بطلها، ثم نطبعها في كتاب بغلاف مقوّى" },
    fq2: { en: "Which photo works best?", ar: "ما الصورة الأنسب؟" },
    fa2: { en: "A clear, front-facing photo in good natural light, with no filters and nothing covering the face.", ar: "صورة واضحة من الأمام بإضاءة طبيعية جيدة، دون فلاتر أو أي شيء يغطي الوجه" },
    fq3: { en: "How closely will the illustration look like my child?", ar: "إلى أي حد ستشبه الرسومات طفلي؟" },
    fa3: { en: "Your child is drawn in the Hikaya storybook style: recognisable, but illustrated rather than a photo pasted onto the page.", ar: "يُرسم طفلك بأسلوب حكاية: يمكن التعرّف عليه، لكنه رسم وليس صورة ملصقة على الصفحة" },
    fq4: { en: "Can I see the book before it's printed?", ar: "هل يمكنني رؤية الكتاب قبل الطباعة؟" },
    fa4: { en: "Not at the moment. Once you order, we create, print and pack your child's book, so please double-check the name, age and photo before checkout.", ar: "ليس حاليًا، بعد الطلب نصنع كتاب طفلك ونطبعه ونغلّفه، لذا يرجى التأكد من الاسم والعمر والصورة قبل الدفع" },
    fq5: { en: "Can I order for siblings?", ar: "هل يمكنني الطلب للإخوة؟" },
    fa5: { en: "Yes. Add a book for each child to the same order. Two books get 10% off each plus free delivery; three or more get 20% off.", ar: "نعم، أضف كتابًا لكل طفل في الطلب نفسه، كتابان بخصم 10% لكل كتاب وتوصيل مجاني، و3 كتب أو أكثر بخصم 20%" },
    fq6: { en: "Can I make changes after ordering?", ar: "هل يمكنني التعديل بعد الطلب؟" },
    fa6: { en: "Contact us as soon as possible and we'll do our best to update the name, dedication or photo before production starts.", ar: "تواصل معنا بأسرع وقت وسنبذل جهدنا لتعديل الاسم أو الإهداء أو الصورة قبل بدء الإنتاج" },
    fq7: { en: "Which ages are the stories for?", ar: "لأي الأعمار هذه القصص؟" },
    fa7: { en: "Our stories are made for ages 2–4, 4–6 and 6–8. You'll find the age on every story.", ar: "قصصنا مصمّمة للأعمار من 2 إلى 4، ومن 4 إلى 6، ومن 6 إلى 8 سنوات، ستجد العمر المناسب على كل قصة" },
    fq8: { en: "Where do you deliver, and how much does it cost?", ar: "إلى أين توصلون، وكم تكلفة التوصيل؟" },
    fa8: { en: "We deliver across the UAE and the GCC. Delivery is free across the UAE. For Saudi Arabia, Qatar, Kuwait, Bahrain and Oman it's AED 30, shown in your local currency. Orders of two or more books ship free.", ar: "نوصل إلى الإمارات ودول الخليج، التوصيل مجاني داخل الإمارات، وللسعودية وقطر والكويت والبحرين وعُمان 30 درهمًا تُعرض بعملتك المحلية، الطلبات التي تضم كتابين أو أكثر توصيلها مجاني" },
    fq9: { en: "How long does delivery take?", ar: "كم يستغرق التوصيل؟" },
    fa9: { en: "Your book usually arrives in about a week.", ar: "يصل كتابك عادة خلال أسبوع تقريبًا" },
    fq10: { en: "Can I send it as a gift?", ar: "هل يمكنني إرساله كهدية؟" },
    fa10: { en: "Yes. Every book arrives in our signature gift box, and we can deliver it straight to the person you're gifting. You can also add a dedication.", ar: "نعم، كل كتاب يصل في علبة الهدايا المميزة، ويمكننا توصيله مباشرة لمن تهديه، ويمكنك أيضًا إضافة إهداء" },
    fq11: { en: "Can I return or cancel a personalised book?", ar: "هل يمكنني إرجاع أو إلغاء كتاب مخصّص؟" },
    fa11: { en: "Because each book is made for one child, personalised orders have special cancellation and return conditions. See our returns policy or contact us.", ar: "لأن كل كتاب يُصنع لطفل واحد، للطلبات المخصّصة شروط خاصة للإلغاء والإرجاع، راجع سياسة الإرجاع أو تواصل معنا" },
    fq12: { en: "What if my book arrives damaged or incorrect?", ar: "ماذا لو وصل الكتاب تالفًا أو غير صحيح؟" },
    fa12: { en: "Contact us with your order number and photos of the issue, and we'll make it right.", ar: "تواصل معنا برقم الطلب وصور المشكلة، وسنصلح الأمر" },
    fq13: { en: "How are uploaded photos used?", ar: "كيف تُستخدم الصور المرفوعة؟" },
    fa13: { en: "Only to create the book you ordered. Photos are never used for advertising or shared beyond what's needed to make your book.", ar: "فقط لصنع الكتاب الذي طلبته، لا تُستخدم الصور في الإعلانات ولا تُشارك إلا بالقدر اللازم لصنع كتابك" },
    fq14: { en: "How long are photos kept?", ar: "إلى متى تُحفظ الصور؟" },
    fa14: { en: "Uploaded photos are deleted automatically after 15 days. You can ask us to delete them sooner at any time.", ar: "تُحذف الصور المرفوعة تلقائيًا بعد 15 يومًا، ويمكنك طلب حذفها قبل ذلك في أي وقت" },
    fq15: { en: "Who can upload a child's photo?", ar: "من يمكنه رفع صورة الطفل؟" },
    fa15: { en: "Only a parent or legal guardian, using a photo they have the right to use.", ar: "الوالدان أو الوصي القانوني فقط، بصورة يحق لهم استخدامها" },
    fq16: { en: "Which languages are available?", ar: "ما اللغات المتاحة؟" },
    fa16: { en: "Hikaya is available in English and Arabic, with a right-to-left layout for Arabic.", ar: "حكاية متاحة بالإنجليزية والعربية، مع تصميم من اليمين إلى اليسار للعربية" },
    ct_title: { en: "Get in touch", ar: "تواصل معنا" },
    ct_sub: { en: "Questions about an order, a photo or delivery? We're here to help.", ar: "لديك سؤال عن طلب أو صورة أو توصيل؟ نحن هنا للمساعدة" },
    ct_name: { en: "Name", ar: "الاسم" },
    ct_email: { en: "Email", ar: "البريد الإلكتروني" },
    ct_order: { en: "Order number (optional)", ar: "رقم الطلب (اختياري)" },
    ct_message: { en: "Message", ar: "الرسالة" },
    ct_send: { en: "Send Message", ar: "إرسال الرسالة" },
    ct_sending: { en: "Sending…", ar: "جارٍ الإرسال…" },
    ct_ok: { en: "Thanks! We'll get back to you soon.", ar: "شكرًا! سنرد عليك قريبًا" },
    ct_missing: { en: "Please fill in your name, email and a short message.", ar: "يرجى إدخال الاسم والبريد الإلكتروني ورسالة قصيرة" },
    ct_err: { en: "Something went wrong. Please try again.", ar: "حدث خطأ ما، يرجى المحاولة مرة أخرى" },
    ct_other: { en: "Other ways to reach us", ar: "طرق أخرى للتواصل" },
    ct_email_l: { en: "Email", ar: "البريد الإلكتروني" },
    ct_resp: { en: "Response time", ar: "وقت الرد" },
    ct_resp_v: { en: "Usually within a day", ar: "عادة خلال يوم" },
    ct_based: { en: "Based in", ar: "مقرّنا" },
    ct_based_v: { en: "United Arab Emirates", ar: "الإمارات العربية المتحدة" },
    ct_track: { en: "Checking on an order?", ar: "تتابع طلبًا؟" },
    ct_track_a: { en: "Track your order", ar: "تتبّع طلبك" },
    next: { en: 'Continue →', ar: 'متابعة ←' },
    change_story: { en: 'Change story', ar: 'تغيير القصة' },
    wz_story_t: { en: "Choose their story", ar: "اختر قصتهم" },
    wz_story_s: { en: "Pick the adventure you want to make theirs.", ar: "اختر المغامرة التي تريد أن تجعلها لهم" },
    wz_details_t: { en: "Tell us about them", ar: "أخبرنا عنهم" },
    wz_details_s: { en: "Their first name, age, and how the story should talk about them.", ar: "الاسم الأول والعمر، وكيف تتحدث القصة عنهم" },
    wz_photo_t: { en: "Add a photo of them", ar: "أضف صورة لهم" },
    wz_photo_s: { en: "A clear, front-facing photo so we can illustrate them as the hero.", ar: "صورة واضحة من الأمام لنرسمهم أبطالًا للقصة" },
    wz_extra_t: { en: "One more character", ar: "شخصية إضافية" },
    wz_extra_s: { en: "This story has a special character you can add.", ar: "في هذه القصة شخصية مميزة يمكنك إضافتها" },
    wz_review_t: { en: "Check and add to cart", ar: "راجع وأضف إلى السلة" },
    wz_review_s: { en: "Make sure everything looks right. You can add a dedication too.", ar: "تأكد أن كل شيء صحيح، ويمكنك إضافة إهداء أيضًا" },
    powered: { en: 'Powered by Maison Jaber FZ-LLC', ar: 'يُدار هذا الموقع من قِبل Maison Jaber FZ-LLC' },
    pay_ziina: { en: "Pay securely", ar: "ادفع بأمان" },
    ziina_title: { en: "Pay securely with Ziina", ar: "ادفع بأمان عبر Ziina" },
    ziina_body: { en: "Pay by card, Apple Pay or Google Pay on Ziina's secure page. We never see your card details.", ar: "ادفع بالبطاقة أو Apple Pay أو Google Pay عبر صفحة Ziina الآمنة، لا نطّلع أبدًا على بيانات بطاقتك" },
    ziina_conv: { en: "You'll be charged {aed} (about {local}).", ar: "سيتم خصم {aed} (ما يعادل تقريبًا {local})" },
    ziina_btn: { en: "Continue to secure payment", ar: "المتابعة إلى الدفع الآمن" },
    ziina_redirect: { en: "Taking you to secure payment\u2026", ar: "جارٍ تحويلك إلى صفحة الدفع الآمن…" },
    ziina_confirming: { en: "Confirming your payment\u2026", ar: "جارٍ تأكيد الدفع…" },
    ziina_cancelled: { en: "Payment cancelled. Your cart is still here whenever you are ready.", ar: "تم إلغاء الدفع، سلتك ما زالت محفوظة متى ما كنت جاهزًا" },
    ziina_failed: { en: "Your payment didn't go through, so you haven't been charged. Please try again.", ar: "لم تتم عملية الدفع، ولم يتم خصم أي مبلغ، يرجى المحاولة مرة أخرى" },
    ziina_slow: { en: "We're still confirming your payment with the bank. We'll email you as soon as it's confirmed. Your reference is {order}.", ar: "ما زلنا نؤكد الدفع مع البنك، وسنراسلك فور التأكيد، رقم طلبك {order}" },
    co_title: { en: 'Checkout', ar: 'إتمام الطلب' },
    cart_items: { en: 'Stories in your cart', ar: 'القصص في سلتك' },
    abt_family: { en: 'Made with family, for families', ar: 'صُنعت مع العائلة، للعائلات' },
    // Our Story (owner-supplied copy, verbatim)
    os_eyebrow: { en: "Our Story", ar: "قصتنا" },
    os_h1: { en: "We grew up keeping things.", ar: "كبرنا ونحن نحتفظ بأشياء بسيطة" },
    os_lede: { en: "Old books. Little notes. School photos. Birthday cards. Things that probably meant very little when we first received them, but somehow became more valuable with time.", ar: "كتب قديمة. رسائل صغيرة. صور مدرسية. بطاقات أعياد ميلاد. أشياء ربما لم تكن تعني لنا الكثير وقتها، لكنها مع مرور السنوات أصبحت أغلى بكثير" },
    os_p2: { en: "You know that feeling when you find an old box at home and suddenly lose an hour going through it? You open a book you had as a child, see your name written inside, and suddenly remember a person, a moment, a feeling you had almost forgotten.", ar: "تعرفون ذلك الشعور عندما تفتحون صندوقاً قديماً في البيت، ثم تكتشفون أن ساعة كاملة مرّت وأنتم تتصفّحون ما فيه؟ كتاب قديم يحمل اسمكم، صورة، ورقة صغيرة… وفجأة تعود إليكم ذكرى شخص، أو لحظة، أو شعور ظننتم أنكم نسيتموه" },
    os_p3: { en: "Wherever life takes us, somehow those memories reconnect us. They bring us back to our families, to where we came from, and to the little moments that shaped us.", ar: "مهما أخذتنا الحياة إلى أماكن مختلفة، هناك دائماً ذكريات تعيدنا إلى عائلتنا، إلى بداياتنا، وإلى التفاصيل الصغيرة التي صنعت جزءاً ممن نحن اليوم" },
    os_p4: { en: "That feeling is a big part of what Maison Jaber means to us. And it is also where Hikaya began.", ar: "هذا الشعور هو جزء كبير مما تعنيه لنا <strong>Maison Jaber</strong>. ومن هنا بدأت أيضاً حكاية" },
    os_p5: { en: "We kept thinking about our children growing up today. Their childhood is full of incredible things, but so much of it lives on a screen. Photos on phones. Videos somewhere in the cloud. Games, messages and moments that can disappear almost as quickly as they happened.", ar: "بدأنا نفكر في أطفالنا وهم يكبرون اليوم. طفولتهم مليئة بأشياء جميلة ومذهلة، لكن جزءاً كبيراً منها أصبح يعيش على شاشة. صور في الهاتف، فيديوهات في السحابة، ألعاب ورسائل ولحظات قد تختفي تقريباً بالسرعة نفسها التي جاءت بها" },
    os_pull: { en: "And we thought: they deserve something they can keep too.", ar: "وفكرنا: <strong>هم أيضاً يستحقون شيئاً يبقى معهم</strong>" },
    os_p6: { en: "We wanted to create books that belong completely to the child. Not simply because their name appears inside, but because they can actually see themselves in the story.", ar: "أردنا أن نصنع كتباً يشعر الطفل أنها تخصّه فعلاً. ليس فقط لأن اسمه موجود داخلها، بل لأنه يرى نفسه في القصة" },
    os_p7: { en: "The visuals matter to us just as much as the words.", ar: "ولهذا، الصورة عندنا مهمة بقدر الكلمة" },
    os_p8: { en: "We want a child to open a Hikaya book and see themselves exploring, solving problems, helping others, being brave, making mistakes and finding their way.", ar: "نريد للطفل أن يفتح كتاباً من حكاية ويرى نفسه يستكشف، يحاول، يساعد، يخطئ، يتعلّم، يتحلّى بالشجاعة، ويجد طريقه بطريقته الخاصة" },
    os_capes: { en: "Because heroes do not always wear capes.", ar: "لأن البطل لا يحتاج دائماً إلى رداء" },
    os_b1: { en: "Sometimes they are the child who tries again. The child who tells the truth. The child who helps someone. The child who is scared but still takes one more step.", ar: "أحياناً يكون البطل هو الطفل الذي يحاول من جديد. أو الذي يقول الحقيقة. أو الذي يساعد شخصاً آخر. أو الذي يشعر بالخوف، لكنه يأخذ خطوة إضافية رغم ذلك" },
    os_b2: { en: "And yes, sometimes our heroes really do wear capes too.", ar: "وأحياناً… نعم، أبطالنا يرتدون رداء البطل أيضاً" },
    os_b3: { en: "We want children to grow up seeing themselves that way.", ar: "المهم بالنسبة لنا أن يرى الطفل نفسه بطلاً في قصته، بطريقته هو" },
    os_p9: { en: "And maybe one day, many years from now, they will find that same book on a shelf or inside an old box. They might smile at the pictures. Remember who used to read it with them. Remember the people around them and the moments they shared.", ar: "وربما بعد سنوات طويلة، يجد نفس الكتاب على رف قديم أو داخل صندوق في البيت. ينظر إلى الصور ويبتسم. يتذكر من كان يقرأ له القصة. ويتذكر الأشخاص واللحظات التي عاشها معهم" },
    os_p10: { en: "That thought means a lot to us.", ar: "هذه الفكرة تعني لنا الكثير" },
    os_care_t: { en: "Made with care", ar: "نصنعها بعناية" },
    os_c1: { en: "We use new technology to help us do something very old-fashioned: make a beautiful storybook worth keeping.", ar: "نستخدم التقنيات الحديثة لنفعل شيئاً بسيطاً وقديماً جداً: نصنع كتاباً جميلاً يستحق أن يبقى" },
    os_c2: { en: "Every Hikaya story is written, edited and refined with care. We want the stories to be fun, but we also want something meaningful to sit quietly inside them — courage, kindness, curiosity, responsibility or confidence.", ar: "كل قصة في حكاية تُكتب وتُراجع وتُطوّر بعناية. نريدها أن تكون ممتعة أولاً، لكننا نريد أيضاً أن تحمل في داخلها شيئاً له معنى — شجاعة، لطفاً، فضولاً، مسؤولية أو ثقة بالنفس" },
    os_c3: { en: "We never want the lesson to feel like a lesson. It should just feel like a really good story.", ar: "ولا نريد أبداً أن يشعر الطفل أن القصة تحاول أن تعطيه درساً. نريدها فقط أن تكون قصة جميلة يحب أن يعود إليها مرة بعد مرة" },
    os_fam_t: { en: "From our family to yours", ar: "من عائلتنا إلى عائلتكم" },
    os_f1: { en: "Hikaya is part of Maison Jaber, our family business.", ar: "حكاية هي جزء من <strong>Maison Jaber</strong>، مشروعنا العائلي" },
    os_f2: { en: "For us, Maison Jaber is not only a name. It is about the things that keep a family connected even when life takes us to different places.", ar: "بالنسبة لنا، Maison Jaber ليست مجرد اسم. هي عن الأشياء التي تبقي العائلة قريبة، حتى عندما تأخذ الحياة كل واحد منا إلى مكان مختلف" },
    os_f3: { en: "An old photograph. A familiar story. Something kept from childhood. Small things that somehow bring everyone back together again.", ar: "صورة قديمة. قصة نعرفها جميعاً. شيء احتفظنا به منذ الطفولة. تفاصيل صغيرة لديها قدرة غريبة على جمعنا من جديد" },
    os_f4: { en: "That is what we want Maison Jaber to carry forward.", ar: "وهذا ما نريد أن تحمله Maison Jaber معها" },
    os_f5: { en: "Things made with meaning. Things worth keeping. Things that one day become part of a family's story.", ar: "أشياء صُنعت بمعنى. أشياء تستحق أن نحتفظ بها. وأشياء تصبح، مع الوقت، جزءاً من قصة عائلة" },
    os_f6: { en: "Hikaya is our first way of doing that.", ar: "وحكاية هي أول طريقة نعبّر بها عن ذلك" },
    os_f7: { en: "A little imagination. A little technology. A lot of care.", ar: "قليل من الخيال. قليل من التكنولوجيا. والكثير من الاهتمام" },
    os_f8: { en: "And hopefully, a memory your child keeps long after they have outgrown the book.", ar: "وعلى أمل أن يبقى هذا الكتاب مع طفلكم… حتى بعد أن يكبر عنه" },
    os_sign: { en: "Let's build their memories together.", ar: "لنصنع ذكرياتهم معاً" },
    // Search, 404
    srch_title: { en: "Search", ar: "البحث" },
    srch_ph: { en: "Search stories, themes or ages", ar: "ابحث عن قصة أو موضوع أو عمر" },
    srch_go: { en: "Search", ar: "بحث" },
    srch_try: { en: "Try:", ar: "جرّب:" },
    srch_results: { en: "Results for “{q}”", ar: "نتائج «{q}»" },
    srch_stories: { en: "Stories", ar: "القصص" },
    srch_pages: { en: "Pages", ar: "الصفحات" },
    srch_none: { en: "No stories match “{q}”. Try a theme like courage or bedtime, or browse them all.", ar: "لا توجد قصص تطابق «{q}»، جرّب موضوعًا مثل الشجاعة أو وقت النوم، أو تصفّح كل القصص" },
    srch_all: { en: "Browse all stories", ar: "تصفّح كل القصص" },
    nf_title: { en: "This page wandered off on an adventure.", ar: "هذه الصفحة ذهبت في مغامرة" },
    nf_sub: { en: "The link may be old or mistyped. Let's get you back to the stories.", ar: "ربما الرابط قديم أو مكتوب بشكل خاطئ، لنعدك إلى القصص" },
    nf_home: { en: "Back to Hikaya", ar: "العودة إلى حكاية" },
  };
})();

/* QA fixes, Oct 2026: tracking, legal headers, accessible names, page titles,
   age ranges and personalisation messages. EN + AR. */
(function () {
  const T = window.HIKAYA_TRANSLATIONS = window.HIKAYA_TRANSLATIONS || {};
  T.a11y = {
    utility: { en: 'Delivery and region', ar: 'التوصيل والمنطقة' },
    region: { en: 'Choose your country and currency', ar: 'اختر بلدك والعملة' },
    home: { en: 'Hikaya by Maison Jaber, home', ar: 'حكاية من ميزون جابر، الصفحة الرئيسية' },
    main_nav: { en: 'Main', ar: 'القائمة الرئيسية' },
    mobile_nav: { en: 'Menu', ar: 'القائمة' },
    search: { en: 'Search stories', ar: 'ابحث في القصص' },
    account: { en: 'Account', ar: 'حسابي' },
    cart: { en: 'Cart', ar: 'السلة' },
    menu_open: { en: 'Open menu', ar: 'افتح القائمة' },
    menu_close: { en: 'Close menu', ar: 'أغلق القائمة' },
    suggestions: { en: 'Suggestions', ar: 'اقتراحات' },
    // QA010: ranges read youngest-to-oldest in Arabic
    age_range: { en: 'Ages {a}–{b}', ar: 'من {a} إلى {b} سنوات' },
    band_words: { en: '{a}–{b}', ar: 'من {a} إلى {b} سنوات' },
  };
  T.ttl = {
    index: { en: 'Hikaya by Maison Jaber | Personalised storybooks', ar: 'حكاية من ميزون جابر | كتب قصص مخصّصة لطفلك' },
    stories: { en: 'Stories | Hikaya', ar: 'القصص | حكاية' },
    story: { en: 'Story | Hikaya', ar: 'القصة | حكاية' },
    age_groups: { en: 'Age Groups | Hikaya', ar: 'الفئات العمرية | حكاية' },
    our_world: { en: 'Our World | Hikaya', ar: 'عالمنا | حكاية' },
    about: { en: 'Our Story | Hikaya', ar: 'قصتنا | حكاية' },
    help: { en: 'FAQs | Hikaya', ar: 'الأسئلة الشائعة | حكاية' },
    contact: { en: 'Contact us | Hikaya', ar: 'تواصل معنا | حكاية' },
    search: { en: 'Search | Hikaya', ar: 'البحث | حكاية' },
    account: { en: 'My account | Hikaya', ar: 'حسابي | حكاية' },
    login: { en: 'Sign in | Hikaya', ar: 'تسجيل الدخول | حكاية' },
    cart: { en: 'Your cart | Hikaya', ar: 'السلة | حكاية' },
    checkout: { en: 'Checkout | Hikaya', ar: 'إتمام الطلب | حكاية' },
    book_added: { en: 'Added to your cart | Hikaya', ar: 'أُضيف إلى السلة | حكاية' },
    personalize: { en: 'Create their story | Hikaya', ar: 'اصنع حكاية طفلك | حكاية' },
    track_order: { en: 'Track your order | Hikaya', ar: 'تتبّع طلبك | حكاية' },
    privacy: { en: 'Privacy Policy | Hikaya', ar: 'سياسة الخصوصية | حكاية' },
    terms: { en: 'Terms of Service | Hikaya', ar: 'شروط الخدمة | حكاية' },
    refund_policy: { en: 'Refund Policy | Hikaya', ar: 'سياسة الاسترداد | حكاية' },
    '404': { en: 'Page not found | Hikaya', ar: 'الصفحة غير موجودة | حكاية' },
  };
  T.trk = {
    title: { en: 'Track Your Order', ar: 'أين وصل طلبك؟' },
    intro: { en: 'Enter your order number and the email you used at checkout.', ar: 'أدخل رقم الطلب والبريد الإلكتروني الذي استخدمته عند الشراء' },
    order_label: { en: 'Order Number', ar: 'رقم الطلب' },
    email_label: { en: 'Email', ar: 'البريد الإلكتروني' },
    action: { en: 'Track Order', ar: 'تتبّع الطلب' },
    pending: { en: 'Checking…', ar: 'نبحث عن طلبك…' },
    not_found: { en: 'We could not find that order. Double-check your order number and email, then try again.', ar: 'لم نجد طلبًا بهذه البيانات، تحقّق من رقم الطلب والبريد الإلكتروني، ثم جرّب مرة أخرى' },
    err_order: { en: 'Please enter your order number.', ar: 'يرجى إدخال رقم الطلب' },
    err_email_missing: { en: 'Please enter the email you used at checkout.', ar: 'يرجى إدخال البريد الإلكتروني الذي استخدمته عند الشراء' },
    err_email: { en: 'Please enter a valid email address, like name@example.com.', ar: 'يرجى إدخال بريد إلكتروني صحيح، مثل name@example.com' },
    err_generic: { en: 'Something went wrong. Please try again.', ar: 'حدث خطأ ما، يرجى المحاولة مرة أخرى' },
    err_timeout: { en: 'This is taking longer than usual. Please try again.', ar: 'يستغرق الأمر وقتًا أطول من المعتاد، يرجى المحاولة مرة أخرى' },
    invoice: { en: 'View Invoice →', ar: 'عرض الفاتورة ←' },
    item_for: { en: '{story} for {name}', ar: '{story} لـ{name}' },
    st_received: { en: 'Order received', ar: 'استلمنا طلبك' },
    st_preparing: { en: 'Personalisation in progress', ar: 'نعمل على تخصيص الكتاب' },
    st_awaiting_approval: { en: 'Final checks', ar: 'المراجعة الأخيرة' },
    st_sent_to_printing: { en: 'Printing', ar: 'قيد الطباعة' },
    st_received_from_printing: { en: 'Packed', ar: 'تم التغليف' },
    st_shipped: { en: 'Shipped', ar: 'تم الشحن' },
    st_delivered: { en: 'Delivered', ar: 'تم التوصيل' },
  };
  T.pz = {
    age_err: { en: 'Please enter a whole-number age from {min} to {max} for this story.', ar: 'يرجى إدخال عمر ضمن الفئة المناسبة لهذه القصة (من {min} إلى {max} سنوات)' },
    extra_q: { en: 'This story has a {name} character', ar: 'في هذه القصة شخصية إضافية: {name}' },
    extra_sub: { en: 'Would you like to use a real photo of the {name_lc}, or keep it generated for you? Using a real photo adds AED {fee}.', ar: 'هل تريد استخدام صورة حقيقية لهذه الشخصية، أم نرسمها لك؟ استخدام صورة حقيقية يضيف {fee} درهم' },
    extra_yes: { en: 'Yes, use a real photo (+AED {fee})', ar: 'نعم، استخدموا صورة حقيقية (+{fee} درهم)' },
    extra_no: { en: 'No, keep it generated', ar: 'لا، ارسموها لي' },
  };
  const P = T.pg = T.pg || {};
  P.legal_eyebrow = { en: 'Legal', ar: 'الشؤون القانونية' };
  P.legal_privacy_t = { en: 'Privacy Policy', ar: 'سياسة الخصوصية' };
  P.legal_terms_t = { en: 'Terms of Service', ar: 'شروط الخدمة' };
  P.legal_refund_t = { en: 'Refund Policy', ar: 'سياسة الاسترداد' };
  P.legal_updated = { en: 'Last updated: October 2026', ar: 'آخر تحديث: أكتوبر 2026' };
})();
(function () {
  const T = window.HIKAYA_TRANSLATIONS = window.HIKAYA_TRANSLATIONS || {};
  T.home6 = T.home6 || {};
  // Theme IDs the dashboard can assign that had no label of their own yet.
  T.home6.th_emotions = T.home6.th_emotions || { en: 'Feelings', ar: 'المشاعر' };
  T.home6.th_imagination = T.home6.th_imagination || { en: 'Imagination', ar: 'الخيال' };
})();
/* Launch QA pass (Oct 2026): shared launch copy. Arabic strings carry no full stops by brand rule. */
(function () {
  const T = window.HIKAYA_TRANSLATIONS = window.HIKAYA_TRANSLATIONS || {};
  T.lx = {
    foot_team: { en: 'A real team, based in the UAE', ar: 'فريق حقيقي مقرّه الإمارات' },
    cover_alt: { en: 'Cover of {title}', ar: 'غلاف قصة {title}' },
    cover: { en: 'Cover', ar: 'الغلاف' },
    sample_n: { en: 'Sample page {n}', ar: 'صفحة نموذجية {n}' },
    open_sample: { en: 'Open sample page {n}', ar: 'افتح الصفحة النموذجية {n}' },
    open_book: { en: 'Open the book photo', ar: 'افتح صورة الكتاب' },
    open_book_alt: { en: '{title}, open to a two-page spread', ar: 'قصة {title} مفتوحة على صفحتين' },
    page_alt: { en: 'Sample page {n} from {title}', ar: 'صفحة نموذجية {n} من قصة {title}' },
    example_alt: { en: 'An open Hikaya book showing an illustrated spread', ar: 'كتاب من حكاية مفتوح على صفحتين مرسومتين' },
    inside_example: { en: 'An example of a Hikaya spread. Your book is illustrated with your child as the hero.', ar: 'مثال على صفحتين من كتب حكاية، وكتابك يُرسم وطفلك بطل القصة' },
    was: { en: 'Was', ar: 'كان' },
    now: { en: 'now', ar: 'الآن' },
    personalise: { en: 'Personalise this story', ar: 'خصّص هذه القصة' },
    see_inside: { en: 'See inside', ar: 'نظرة إلى الداخل' },
    price_line: { en: 'Personalised hardcover · {price} · Gift packaging included', ar: 'كتاب مخصّص بغلاف مقوّى · {price} · يشمل تغليف الهدية' },
    eta: { en: 'Delivery to {country}: about {n} working days', ar: 'التوصيل إلى {country}: نحو {n} أيام عمل' },
    eta_short: { en: 'About {n} working days', ar: 'نحو {n} أيام عمل' },
    catalog_wait: { en: 'New stories are on their way. Please check back soon.', ar: 'قصص جديدة في الطريق، عُد إلينا قريبًا' },
    filter_aria: { en: 'Filter stories', ar: 'تصفية القصص' },
    empty_t: { en: 'No stories match these filters', ar: 'لا توجد قصص تطابق هذا الاختيار' },
    fact_format: { en: 'Personalised square hardcover', ar: 'كتاب مخصّص مربّع بغلاف مقوّى' },
    close: { en: 'Close', ar: 'إغلاق' },
    trust_t: { en: 'Why parents trust Hikaya', ar: 'لماذا يثق الأهل بحكاية' },
    tr_book: { en: 'Personalised hardcover', ar: 'كتاب مخصّص بغلاف مقوّى' },
    tr_private: { en: "Your child's photo stays private", ar: 'صورة طفلك تبقى خاصة' },
    tr_secure: { en: 'Secure payment', ar: 'دفع آمن' },
    tr_box: { en: 'Gift packaging included', ar: 'تغليف الهدية مشمول' },
    tr_gcc: { en: 'Delivered across the UAE & GCC', ar: 'توصيل إلى الإمارات ودول الخليج' },
    tr_team: { en: 'Support from a real UAE-based team', ar: 'دعم من فريق حقيقي في الإمارات' },
    /* Photo privacy */
    pv_title: { en: "How we protect your child's photo", ar: 'كيف نحمي صورة طفلك' },
    pv_lede: { en: 'You are trusting us with something precious. Here is exactly what happens to the photo you upload.', ar: 'أنت تأتمننا على شيء ثمين، وهذا بالضبط ما يحدث للصورة التي ترفعها' },
    pv_why_t: { en: 'Why we ask for a photo', ar: 'لماذا نطلب صورة' },
    pv_why: { en: 'We need one clear photo so we can illustrate your child as the hero of their book. That is the only reason we ask for it.', ar: 'نحتاج إلى صورة واضحة واحدة لنرسم طفلك بطلًا لكتابه، وهذا هو السبب الوحيد لطلبها' },
    pv_use_t: { en: 'How the photo is used', ar: 'كيف تُستخدم الصورة' },
    pv_use: { en: 'It is used to create the illustrations for the book you order. Each photo gets an automatic check that a face is visible and the image is suitable, and we use trusted service providers to create the illustrations and print the book. They only receive what is needed to make your book.', ar: 'تُستخدم لصنع رسومات الكتاب الذي تطلبه، وتمرّ كل صورة بفحص آلي للتأكد من ظهور الوجه وملاءمة الصورة، ونستعين بمزوّدي خدمات موثوقين لصنع الرسومات وطباعة الكتاب، ولا يتلقّون إلا ما يلزم لصنع كتابك' },
    pv_who_t: { en: 'Who can see it', ar: 'من يمكنه رؤيتها' },
    pv_who: { en: 'Only the Maison Jaber team preparing your order, plus those service providers. Your child’s photo is never shared with anyone else.', ar: 'فريق ميزون جابر الذي يجهّز طلبك فقط، إضافة إلى مزوّدي الخدمات هؤلاء، ولا نشارك صورة طفلك مع أي أحد آخر' },
    pv_public_t: { en: 'Never public without your permission', ar: 'لا نشر دون إذنك' },
    pv_public: { en: 'We never use your child’s photo or book in advertising, on social media or in a public gallery unless you have given us written permission.', ar: 'لا نستخدم صورة طفلك أو كتابه في الإعلانات أو على وسائل التواصل أو في أي معرض عام إلا بإذن كتابي منك' },
    pv_keep_t: { en: 'How long we keep it', ar: 'إلى متى نحتفظ بها' },
    pv_keep: { en: 'Uploaded photos are deleted within 15 days. You can ask us to delete them sooner at any time.', ar: 'تُحذف الصور المرفوعة خلال 15 يومًا، ويمكنك أن تطلب حذفها قبل ذلك في أي وقت' },
    pv_guardian_t: { en: 'Who should upload', ar: 'من يرفع الصورة' },
    pv_guardian: { en: 'Only a parent or legal guardian, using a photo they have the right to share.', ar: 'الوالدان أو الوصي القانوني فقط، بصورة يحق لهم مشاركتها' },
    pv_contact: { en: 'Questions, or want a photo deleted now? Email us and a real person will reply, usually within a day.', ar: 'لديك سؤال أو تريد حذف صورة الآن؟ راسلنا وسيردّ عليك شخص حقيقي، عادةً خلال يوم' },
    pv_policy: { en: 'Read our full privacy policy', ar: 'اقرأ سياسة الخصوصية كاملة' },
    /* Checkout and confirmation */
    pay_loading: { en: 'Loading secure payment options…', ar: 'جارٍ تحميل خيارات الدفع الآمن…' },
    approval: { en: "I have checked the story, my child's name, age, photo and dedication. I understand the book goes straight to production after payment.", ar: 'راجعت القصة واسم طفلي وعمره وصورته والإهداء، وأعلم أن الكتاب يدخل مرحلة الإنتاج مباشرة بعد الدفع' },
    next_t: { en: 'What happens next', ar: 'ماذا يحدث بعد ذلك' },
    od_n1_t: { en: 'Payment confirmed', ar: 'تم تأكيد الدفع' },
    od_n1: { en: "We've emailed your confirmation. Keep your order number handy.", ar: 'أرسلنا إليك تأكيد الطلب بالبريد الإلكتروني، احتفظ برقم طلبك' },
    od_n2_t: { en: 'We create and print their book', ar: 'نصنع كتابهم ونطبعه' },
    od_n2: { en: 'Our team illustrates your child into the story and prints the hardcover. Need a change? Contact us quickly, before production starts.', ar: 'يرسم فريقنا طفلك داخل القصة ويطبع الكتاب بغلاف مقوّى، وإن احتجت إلى تعديل فتواصل معنا سريعًا قبل بدء الإنتاج' },
    od_n3_t: { en: 'Packed and delivered', ar: 'التغليف والتوصيل' },
    od_n3: { en: 'Gift-boxed and delivered to your door. Track progress any time with your order number and email.', ar: 'يُغلّف في علبة الهدايا ويصل إلى بابك، ويمكنك متابعة طلبك في أي وقت برقم الطلب وبريدك الإلكتروني' },
    /* Personalisation */
    step_of: { en: 'Step {n} of {total}', ar: 'الخطوة {n} من {total}' },
    st_story: { en: 'Story', ar: 'القصة' },
    st_child: { en: 'Child', ar: 'الطفل' },
    st_photo: { en: 'Photo', ar: 'الصورة' },
    st_extra: { en: 'Extra character', ar: 'شخصية إضافية' },
    st_review: { en: 'Review', ar: 'المراجعة' },
    cont: { en: 'Continue', ar: 'متابعة' },
    add_cart: { en: 'Add to cart · {price}', ar: 'أضف إلى السلة · {price}' },
    nx_t: { en: 'What happens next', ar: 'ماذا يحدث بعد ذلك' },
    nx1: { en: 'Checkout: pay securely by card, Apple Pay or Google Pay. Your order is confirmed once payment goes through.', ar: 'الدفع: ادفع بأمان بالبطاقة أو Apple Pay أو Google Pay، ويتأكد طلبك فور نجاح الدفع' },
    nx2: { en: 'We create and print: our team illustrates {name} into the story and prints the hardcover.', ar: 'الصنع والطباعة: يرسم فريقنا {name} داخل القصة ويطبع الكتاب بغلاف مقوّى' },
    nx3: { en: 'Delivered gift-boxed: {eta}.', ar: 'التوصيل في علبة هدايا: {eta}' },
    check_note: { en: 'There is no preview step, so please check the name, age and photo now. Need a change after ordering? Contact us quickly and we will update it if production has not started.', ar: 'لا توجد خطوة معاينة، لذا يرجى التأكد من الاسم والعمر والصورة الآن، وإن احتجت إلى تعديل بعد الطلب فتواصل معنا سريعًا وسنعدّله إن لم يبدأ الإنتاج' },
    uploading: { en: 'Saving your photo securely… {pct}%', ar: 'نحفظ صورتك بأمان… {pct}%' },
    upload_fail: { en: "We couldn't save your photo. Please check your connection and try again. Nothing has been charged.", ar: 'تعذّر حفظ صورتك، يرجى التحقق من الاتصال والمحاولة مرة أخرى، ولم يُخصم أي مبلغ' },
    book_lang: { en: 'Book language', ar: 'لغة الكتاب' },
    lang_en: { en: 'English', ar: 'الإنجليزية' },
    lang_ar: { en: 'Arabic', ar: 'العربية' },
    summary_t: { en: 'Your book', ar: 'كتابك' },
    photo_tap: { en: 'Tap to add a photo', ar: 'اضغط لإضافة صورة' },
    photo_more: { en: 'One clear photo is enough. You can add a second for a better likeness.', ar: 'تكفي صورة واضحة واحدة، ويمكنك إضافة صورة ثانية لشبه أدق' },
    remove_photo: { en: 'Remove photo', ar: 'إزالة الصورة' },
    /* Order tracking */
    trk_unpaid: { en: 'We have your order, but payment has not been confirmed yet. If you paid, it can take a few minutes. If not, you can complete your order from the cart.', ar: 'وصلنا طلبك لكن الدفع لم يتأكد بعد، وإن كنت قد دفعت فقد يستغرق ذلك بضع دقائق، وإلا يمكنك إكمال طلبك من السلة' },
    trk_eta: { en: 'Estimated delivery', ar: 'التوصيل المتوقع' },
    /* Contact */
    ct_err_name: { en: 'Please tell us your name.', ar: 'يرجى كتابة اسمك' },
    ct_err_email: { en: 'Please enter a valid email so we can reply, like name@example.com.', ar: 'يرجى إدخال بريد إلكتروني صحيح لنتمكن من الرد، مثل name@example.com' },
    ct_err_msg: { en: 'Please write a short message (at least 10 characters).', ar: 'يرجى كتابة رسالة قصيرة (10 أحرف على الأقل)' },
    ct_ok: { en: "Thank you, your message is with us. We'll reply by email, usually within a day.", ar: 'شكرًا لك، وصلتنا رسالتك وسنردّ عليك بالبريد الإلكتروني، عادةً خلال يوم' },
  };
})();
/* FAQ (launch QA pass, Oct 2026). Answers may contain links, so they are applied as HTML. */
(function () {
  const T = window.HIKAYA_TRANSLATIONS = window.HIKAYA_TRANSLATIONS || {};
  T.fq = {
 "g_personal": {
  "en": "Personalisation",
  "ar": "التخصيص"
 },
 "q1": {
  "en": "How does personalisation work?",
  "ar": "كيف يعمل التخصيص؟"
 },
 "a1": {
  "en": "Choose a story, then add your child's first name, age and a clear photo, plus an optional dedication. We illustrate your child as the hero, print the book as a hardcover and deliver it gift-boxed.",
  "ar": "اختر قصة، ثم أضف الاسم الأول لطفلك وعمره وصورة واضحة له، ويمكنك إضافة إهداء، فنرسم طفلك بطلًا للقصة ونطبعها في كتاب بغلاف مقوّى ونوصلها في علبة هدايا"
 },
 "q2": {
  "en": "How will my child appear in the book?",
  "ar": "كيف سيظهر طفلي في الكتاب؟"
 },
 "a2": {
  "en": "Your child is drawn in the Hikaya illustration style, based on the photo you share: recognisable, but illustrated rather than a photo pasted onto the page. Their name is woven through the story.",
  "ar": "يُرسم طفلك بأسلوب حكاية بناءً على الصورة التي تشاركها، فيمكن التعرّف عليه لكنه رسم وليس صورة ملصقة على الصفحة، ويتكرر اسمه في أنحاء القصة"
 },
 "q3": {
  "en": "What makes a good photo?",
  "ar": "ما الصورة المناسبة؟"
 },
 "a3": {
  "en": "A recent, clear, front-facing photo of your child alone, in good natural light, with no filters, sunglasses or hands covering the face. One good photo is enough.",
  "ar": "صورة حديثة وواضحة لطفلك وحده من الأمام، بإضاءة طبيعية جيدة، دون فلاتر أو نظارات شمسية أو أيدٍ تغطي الوجه، وتكفي صورة جيدة واحدة"
 },
 "q4": {
  "en": "Will I see a preview before printing?",
  "ar": "هل سأرى معاينة قبل الطباعة؟"
 },
 "a4": {
  "en": "Not at the moment. We create and print your book straight after payment, so please double-check the name, age and photo before you check out.",
  "ar": "ليس حاليًا، فنحن نصنع كتابك ونطبعه مباشرة بعد الدفع، لذا يرجى التأكد من الاسم والعمر والصورة قبل إتمام الطلب"
 },
 "q5": {
  "en": "Can I make changes after ordering?",
  "ar": "هل يمكنني التعديل بعد الطلب؟"
 },
 "a5": {
  "en": "Contact us as soon as possible with your order number. We'll gladly update the name, dedication or photo if production hasn't started yet. Once illustration or printing begins, changes are no longer possible.",
  "ar": "تواصل معنا بأسرع وقت مع رقم طلبك، وسنعدّل الاسم أو الإهداء أو الصورة بكل سرور إن لم يبدأ الإنتاج بعد، أما بعد بدء الرسم أو الطباعة فلا يمكن التعديل"
 },
 "q6": {
  "en": "Which ages are the stories for?",
  "ar": "لأي الأعمار هذه القصص؟"
 },
 "a6": {
  "en": "Ages 2–4, 4–6 and 6–8. Every story shows its age range, and we make the edition that matches your child's age.",
  "ar": "للأعمار من 2 إلى 4، ومن 4 إلى 6، ومن 6 إلى 8 سنوات، وتظهر الفئة العمرية على كل قصة، ونصنع الإصدار المناسب لعمر طفلك"
 },
 "q7": {
  "en": "Which languages are available?",
  "ar": "ما اللغات المتاحة؟"
 },
 "a7": {
  "en": "Hikaya books are available in English and Arabic. You choose the book language when you review your order, and this website works in both languages.",
  "ar": "كتب حكاية متاحة بالإنجليزية والعربية، وتختار لغة الكتاب عند مراجعة طلبك، والموقع متاح باللغتين أيضًا"
 },
 "g_book": {
  "en": "The book and price",
  "ar": "الكتاب والسعر"
 },
 "q8": {
  "en": "What is the book like? Is it a hardcover?",
  "ar": "كيف يبدو الكتاب؟ وهل غلافه مقوّى؟"
 },
 "a8": {
  "en": "Yes. Every Hikaya book is a personalised square hardcover, printed in premium quality and made to be read again and again.",
  "ar": "نعم، كل كتاب من حكاية كتاب مخصّص مربّع بغلاف مقوّى، مطبوع بجودة عالية ومصنوع ليُقرأ مرة بعد مرة"
 },
 "q9": {
  "en": "What size is the book?",
  "ar": "ما مقاس الكتاب؟"
 },
 "a9": {
  "en": "Hikaya books are square, sized to share together at bedtime and keep on the shelf for years. If you need exact measurements for a gift, just ask us.",
  "ar": "كتب حكاية مربّعة الشكل، بحجم مناسب للقراءة معًا قبل النوم والاحتفاظ بها على الرف لسنوات، وإن احتجت إلى المقاس الدقيق لهدية فاسألنا"
 },
 "q10": {
  "en": "How much does a book cost?",
  "ar": "كم سعر الكتاب؟"
 },
 "a10": {
  "en": "Books are on offer: was AED 199, now AED 149 in the UAE (was SAR 199, now SAR 149 in Saudi Arabia and was QAR 199, now QAR 149 in Qatar). In Kuwait it is KWD 12.50 (was KWD 16.75), in Bahrain BHD 15.25 (was BHD 20.50) and in Oman OMR 15.50 (was OMR 21). Gift packaging is always included. Ordering for siblings? 2 books get 10% off each plus free delivery, and 3 or more get 20% off.",
  "ar": "الكتب بسعر العرض: كان 199 درهمًا والآن 149 درهمًا في الإمارات (كان 199 ريالًا والآن 149 ريالًا في السعودية، وكان 199 ريالًا قطريًا والآن 149 في قطر)، وفي الكويت 12.50 دينار (كان 16.75)، وفي البحرين 15.25 دينار (كان 20.50)، وفي عُمان 15.50 ريال (كان 21)، وتغليف الهدية مشمول دائمًا، وعند الطلب للإخوة يحصل كتابان على خصم 10% لكل كتاب مع توصيل مجاني، و3 كتب أو أكثر على خصم 20%"
 },
 "q11": {
  "en": "Is gift packaging included?",
  "ar": "هل تغليف الهدية مشمول؟"
 },
 "a11": {
  "en": "Yes, at no extra cost. Every book arrives in our signature gift box with tissue, a satin ribbon and a tag. We can deliver straight to the person you're gifting, and you can add a gift message at checkout.",
  "ar": "نعم ودون أي تكلفة إضافية، فكل كتاب يصل في علبة الهدايا المميزة مع ورق مناديل وشريط ساتان وبطاقة، ويمكننا توصيله مباشرة لمن تهديه، ويمكنك إضافة رسالة إهداء عند الدفع"
 },
 "g_delivery": {
  "en": "Delivery and tracking",
  "ar": "التوصيل والتتبع"
 },
 "q12": {
  "en": "How long does UAE delivery take?",
  "ar": "كم يستغرق التوصيل داخل الإمارات؟"
 },
 "a12": {
  "en": "About 5 working days from your order, and delivery across the UAE is free.",
  "ar": "نحو 5 أيام عمل من تاريخ الطلب، والتوصيل مجاني لجميع أنحاء الإمارات"
 },
 "q13": {
  "en": "How long does delivery to Saudi Arabia take?",
  "ar": "كم يستغرق التوصيل إلى السعودية؟"
 },
 "a13": {
  "en": "About 5 working days. Delivery is SAR 30, or free when you order 2 or more books.",
  "ar": "نحو 5 أيام عمل، ورسوم التوصيل 30 ريالًا، أو مجانًا عند طلب كتابين أو أكثر"
 },
 "q14": {
  "en": "Do you deliver to other GCC countries?",
  "ar": "هل توصلون إلى بقية دول الخليج؟"
 },
 "a14": {
  "en": "Yes, to Qatar, Kuwait, Bahrain and Oman, in about 7 working days. Delivery is the equivalent of AED 30 in your local currency, or free on 2 or more books.",
  "ar": "نعم، إلى قطر والكويت والبحرين وعُمان خلال نحو 7 أيام عمل، ورسوم التوصيل تعادل 30 درهمًا بعملتك المحلية، أو مجانًا عند طلب كتابين أو أكثر"
 },
 "q15": {
  "en": "How do I track my order?",
  "ar": "كيف أتتبع طلبي؟"
 },
 "a15": {
  "en": "Use <a href=\"track-order.html\">Track your order</a> with your order number and the email you used at checkout.",
  "ar": "استخدم صفحة <a href=\"track-order.html\">تتبع طلبك</a> برقم الطلب والبريد الإلكتروني الذي استخدمته عند الدفع"
 },
 "g_help": {
  "en": "Payment, returns and help",
  "ar": "الدفع والإرجاع والمساعدة"
 },
 "q16": {
  "en": "How do I pay?",
  "ar": "كيف أدفع؟"
 },
 "a16": {
  "en": "By card, Apple Pay or Google Pay on Ziina's secure payment page. Payments are charged in UAE dirhams (AED); if you shop in another GCC currency, you'll see the AED amount before you pay. We never see or store your card details.",
  "ar": "بالبطاقة أو Apple Pay أو Google Pay عبر صفحة الدفع الآمنة من Ziina، ويُحتسب المبلغ بالدرهم الإماراتي، وإن كنت تتسوّق بعملة خليجية أخرى فسترى المبلغ بالدرهم قبل الدفع، ولا نطّلع على بيانات بطاقتك ولا نحفظها"
 },
 "q17": {
  "en": "What if my book arrives damaged or misprinted?",
  "ar": "ماذا لو وصل الكتاب تالفًا أو بخطأ في الطباعة؟"
 },
 "a17": {
  "en": "We're sorry if that happens. Contact us within 14 days of delivery with your order number and photos of the issue, and we'll replace the book or refund you in full, whichever you prefer.",
  "ar": "نأسف إن حدث ذلك، تواصل معنا خلال 14 يومًا من التوصيل مع رقم الطلب وصور المشكلة، وسنستبدل الكتاب أو نردّ لك المبلغ كاملًا بحسب ما تفضّل"
 },
 "q18": {
  "en": "Can I cancel or return a personalised book?",
  "ar": "هل يمكنني إلغاء الكتاب المخصّص أو إرجاعه؟"
 },
 "a18": {
  "en": "Each book is made for one child, so it can't be returned for a change of mind once illustration or printing has begun. Before that, contact us quickly and we can cancel for a full refund. See our <a href=\"refund-policy.html\">returns policy</a>.",
  "ar": "يُصنع كل كتاب لطفل واحد، لذا لا يمكن إرجاعه لتغيير الرأي بعد بدء الرسم أو الطباعة، أما قبل ذلك فتواصل معنا سريعًا ونلغي الطلب مع استرداد كامل المبلغ، واطّلع على <a href=\"refund-policy.html\">سياسة الإرجاع</a>"
 },
 "q19": {
  "en": "How do I contact you?",
  "ar": "كيف أتواصل معكم؟"
 },
 "a19": {
  "en": "Email <a href=\"mailto:hello@maison-jaber.com\" dir=\"ltr\">hello@maison-jaber.com</a> or use our <a href=\"contact.html\">contact form</a>. We're a real team based in the UAE and usually reply within a day.",
  "ar": "راسلنا على <a href=\"mailto:hello@maison-jaber.com\" dir=\"ltr\">hello@maison-jaber.com</a> أو استخدم <a href=\"contact.html\">نموذج التواصل</a>، فنحن فريق حقيقي في الإمارات ونردّ عادةً خلال يوم"
 },
 "g_privacy": {
  "en": "Your child's photo and privacy",
  "ar": "صورة طفلك وخصوصيتك"
 },
 "q20": {
  "en": "How is my child's photo used?",
  "ar": "كيف تُستخدم صورة طفلي؟"
 },
 "a20": {
  "en": "Only to create the book you order. It is never used for advertising, social media or public galleries without your written permission. <a href=\"#\" data-photo-privacy>How we protect your child's photo</a>",
  "ar": "لصنع الكتاب الذي تطلبه فقط، ولا تُستخدم في الإعلانات أو على وسائل التواصل أو في المعارض العامة دون إذن كتابي منك <a href=\"#\" data-photo-privacy>كيف نحمي صورة طفلك</a>"
 },
 "q21": {
  "en": "How long do you keep photos?",
  "ar": "إلى متى تحتفظون بالصور؟"
 },
 "a21": {
  "en": "Uploaded photos are deleted within 15 days. You can ask us to delete them sooner at any time by emailing hello@maison-jaber.com.",
  "ar": "تُحذف الصور المرفوعة خلال 15 يومًا، ويمكنك أن تطلب حذفها قبل ذلك في أي وقت عبر البريد hello@maison-jaber.com"
 },
 "q22": {
  "en": "Who can upload a child's photo?",
  "ar": "من يمكنه رفع صورة الطفل؟"
 },
 "a22": {
  "en": "Only a parent or legal guardian, using a photo they have the right to share.",
  "ar": "الوالدان أو الوصي القانوني فقط، بصورة يحق لهم مشاركتها"
 },
 "title": {
  "en": "Frequently asked questions",
  "ar": "الأسئلة الشائعة"
 },
 "sub": {
  "en": "Everything about personalisation, your child's photo, delivery and gifting. Can't find your answer? We're happy to help.",
  "ar": "كل ما تريد معرفته عن التخصيص وصورة طفلك والتوصيل والهدايا، ولم تجد إجابتك؟ يسعدنا مساعدتك"
 },
 "more": {
  "en": "Still have a question? A real person on our UAE team will reply, usually within a day.",
  "ar": "لديك سؤال آخر؟ سيردّ عليك شخص حقيقي من فريقنا في الإمارات، عادةً خلال يوم"
 }
};
})();
(function () {
  const T = window.HIKAYA_TRANSLATIONS = window.HIKAYA_TRANSLATIONS || {};
  T.trk_c = {
    received: { en: 'Order received', ar: 'استلمنا طلبك' },
    preparing: { en: 'Personalisation in progress', ar: 'نعمل على تخصيص الكتاب' },
    checks: { en: 'Final checks', ar: 'المراجعة الأخيرة' },
    printing: { en: 'Printing', ar: 'قيد الطباعة' },
    packed: { en: 'Packed', ar: 'تم التغليف' },
  };
})();

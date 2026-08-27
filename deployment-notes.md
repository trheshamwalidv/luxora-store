# LUXORA — ملاحظات النقل والنشر المستقل

## موارد مستقلة مؤكدة

| المورد | الحالة | الحساب / الاسم | ملاحظات |
| --- | --- | --- | --- |
| GitHub | حساب اختبار مستقل ونظيف | `trheshamwalidv` | مرتبط بالبريد `heshamwalid9996@gmail.com`. حُذف المستودع التجريبي السابق بعد تحقق وموافقة صريحة. |
| Vercel | حساب اختبار مستقل ونظيف | `trheshamwalidvs-projects` | حُذف مشروع التجربة السابق. لا يوجد نطاق قديم مرتبط. |
| قاعدة البيانات | مورد مستقل نشط | TiDB Cloud `luxora-store` | خطة Starter وحد إنفاق `$0`. قاعدة `luxora` تحتوي ثمانية جداول: users، store_settings، collections، products، product_variants، product_images، campaigns، campaign_products. |
| الصور | حساب مستقل تم إنشاؤه | Cloudinary cloud name `dbt9psvo` | يلزم تسجيل الدخول من جديد عبر GitHub لإنشاء Upload Preset وترحيل صور الواجهة قبل النشر الدائم. |
| التجارة | متجر مستقل | Shopify LUXORA | يبقى Checkout الرسمي فيه، ولا يصبح الدفع فعليًا قبل مطالبة المالك بالمتجر وإعداد الدفع والشحن. |

## ملاحظات التوافق

تمت إضافة تهيئة Vercel مستقلة في `vercel.json`، وبناء الواجهة المخصص `pnpm run build:vercel` ينجح محليًا. التهيئة تعتمد على Vite لإخراج `dist/public` ودالة API لمسار `/api/trpc/*`، مع إعادة كتابة مسارات الـ SPA إلى `index.html` مع استثناء `/api`.

حماية لوحة الإدارة في الاستضافة الخارجية تعتمد على متغير البيئة `LUXORA_ADMIN_PASSWORD` وجلسة موقعة بواسطة `JWT_SECRET`. يكتشف التطبيق تلقائيًا وجود كلمة مرور المالك ويعرض بوابة LUXORA المستقلة، لذلك لا يحتاج متغير واجهة منفصل ولا يعيد التوجيه إلى Manus. لا تضع أي قيمة سرية في المستودع أو ملف توثيق.

## مصادر خارجية راجعتها

TiDB Cloud يوضح أن مورد Starter المجاني يتطلب TLS وأن إنشاء كلمة المرور يتم من نافذة **Connect**؛ لا تعرض كلمة المرور لاحقًا، لذا تبقى ضمن إدارة المالك فقط. [وثائق الاتصال الرسمية](https://docs.pingcap.com/tidbcloud/secure-connections-to-serverless-clusters/)

Vercel يوضح أن تطبيقات Vite تحتاج rewrite لمسارات SPA، وأن تطبيق Express يمكن تصديره كتطبيق افتراضي داخل Function. [وثائق Vite](https://vercel.com/docs/frameworks/frontend/vite) و[وثائق Express](https://vercel.com/docs/frameworks/backend/express)

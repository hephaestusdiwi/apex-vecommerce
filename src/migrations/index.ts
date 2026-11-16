import * as migration_20261014_051019_initial from './20261014_051019_initial';
import * as migration_20261015_071612_seo_fields from './20261015_071612_seo_fields';
import * as migration_20261015_164121_og_size from './20261015_164121_og_size';
import * as migration_20261016_064414_logo_header from './20261016_064414_logo_header';
import * as migration_20261016_072034_photoswipe_toggle from './20261016_072034_photoswipe_toggle';
import * as migration_20261017_041300_editorial_workflow from './20261017_041300_editorial_workflow';
import * as migration_20261017_194029_spam_protection from './20261017_194029_spam_protection';
import * as migration_20261017_195137 from './20261017_195137';
import * as migration_20261018_153007_service_packages from './20261018_153007_service_packages';
import * as migration_20261018_163007_booking_availability from './20261018_163007_booking_availability';
import * as migration_20261018_163920 from './20261018_163920';
import * as migration_20261018_171422_bookings from './20261018_171422_bookings';
import * as migration_20261019_141403_booking_notifications from './20261019_141403_booking_notifications';
import * as migration_20261020_174822_booking_reminder from './20261020_174822_booking_reminder';
import * as migration_20261020_180010_blog_posts from './20261020_180010_blog_posts';
import * as migration_20261023_103600_font_settings from './20261023_103600_font_settings';
import * as migration_20261024_180418_users_invites from './20261024_180418_users_invites';
import * as migration_20261027_223043_scroll_story from './20261027_223043_scroll_story';
import * as migration_20261111_011639_schema_drift from './20261111_011639_schema_drift';
import * as migration_20261111_011640_users_customer_role from './20261111_011640_users_customer_role';
import * as migration_20261111_011641_step1_customers from './20261111_011641_step1_customers';
import * as migration_20261111_011642_preserve_booking_payments from './20261111_011642_preserve_booking_payments';
import * as migration_20261111_065053_step2_catalog from './20261111_065053_step2_catalog';
import * as migration_20261112_014423_step3_cart from './20261112_014423_step3_cart';
import * as migration_20261112_030845_step4_cart_checkout from './20261112_030845_step4_cart_checkout';
import * as migration_20261112_031137_step4_checkout_shipping_address from './20261112_031137_step4_checkout_shipping_address';
import * as migration_20261113_154016_step5_product_editorial from './20261113_154016_step5_product_editorial';
import * as migration_20261115_163925_step6_product_sections from './20261115_163925_step6_product_sections';
import * as migration_20261116_040253_step7_product_explorer from './20261116_040253_step7_product_explorer';

export const migrations = [
  {
    up: migration_20261014_051019_initial.up,
    down: migration_20261014_051019_initial.down,
    name: '20261014_051019_initial',
  },
  {
    up: migration_20261015_071612_seo_fields.up,
    down: migration_20261015_071612_seo_fields.down,
    name: '20261015_071612_seo_fields',
  },
  {
    up: migration_20261015_164121_og_size.up,
    down: migration_20261015_164121_og_size.down,
    name: '20261015_164121_og_size',
  },
  {
    up: migration_20261016_064414_logo_header.up,
    down: migration_20261016_064414_logo_header.down,
    name: '20261016_064414_logo_header',
  },
  {
    up: migration_20261016_072034_photoswipe_toggle.up,
    down: migration_20261016_072034_photoswipe_toggle.down,
    name: '20261016_072034_photoswipe_toggle',
  },
  {
    up: migration_20261017_041300_editorial_workflow.up,
    down: migration_20261017_041300_editorial_workflow.down,
    name: '20261017_041300_editorial_workflow',
  },
  {
    up: migration_20261017_194029_spam_protection.up,
    down: migration_20261017_194029_spam_protection.down,
    name: '20261017_194029_spam_protection',
  },
  {
    up: migration_20261017_195137.up,
    down: migration_20261017_195137.down,
    name: '20261017_195137',
  },
  {
    up: migration_20261018_153007_service_packages.up,
    down: migration_20261018_153007_service_packages.down,
    name: '20261018_153007_service_packages',
  },
  {
    up: migration_20261018_163007_booking_availability.up,
    down: migration_20261018_163007_booking_availability.down,
    name: '20261018_163007_booking_availability',
  },
  {
    up: migration_20261018_163920.up,
    down: migration_20261018_163920.down,
    name: '20261018_163920',
  },
  {
    up: migration_20261018_171422_bookings.up,
    down: migration_20261018_171422_bookings.down,
    name: '20261018_171422_bookings',
  },
  {
    up: migration_20261019_141403_booking_notifications.up,
    down: migration_20261019_141403_booking_notifications.down,
    name: '20261019_141403_booking_notifications',
  },
  {
    up: migration_20261020_174822_booking_reminder.up,
    down: migration_20261020_174822_booking_reminder.down,
    name: '20261020_174822_booking_reminder',
  },
  {
    up: migration_20261020_180010_blog_posts.up,
    down: migration_20261020_180010_blog_posts.down,
    name: '20261020_180010_blog_posts',
  },
  {
    up: migration_20261023_103600_font_settings.up,
    down: migration_20261023_103600_font_settings.down,
    name: '20261023_103600_font_settings',
  },
  {
    up: migration_20261024_180418_users_invites.up,
    down: migration_20261024_180418_users_invites.down,
    name: '20261024_180418_users_invites',
  },
  {
    up: migration_20261027_223043_scroll_story.up,
    down: migration_20261027_223043_scroll_story.down,
    name: '20261027_223043_scroll_story',
  },
  {
    up: migration_20261111_011639_schema_drift.up,
    down: migration_20261111_011639_schema_drift.down,
    name: '20261111_011639_schema_drift',
  },
  {
    up: migration_20261111_011640_users_customer_role.up,
    down: migration_20261111_011640_users_customer_role.down,
    name: '20261111_011640_users_customer_role',
  },
  {
    up: migration_20261111_011641_step1_customers.up,
    down: migration_20261111_011641_step1_customers.down,
    name: '20261111_011641_step1_customers',
  },
  {
    up: migration_20261111_011642_preserve_booking_payments.up,
    down: migration_20261111_011642_preserve_booking_payments.down,
    name: '20261111_011642_preserve_booking_payments',
  },
  {
    up: migration_20261111_065053_step2_catalog.up,
    down: migration_20261111_065053_step2_catalog.down,
    name: '20261111_065053_step2_catalog',
  },
  {
    up: migration_20261112_014423_step3_cart.up,
    down: migration_20261112_014423_step3_cart.down,
    name: '20261112_014423_step3_cart',
  },
  {
    up: migration_20261112_030845_step4_cart_checkout.up,
    down: migration_20261112_030845_step4_cart_checkout.down,
    name: '20261112_030845_step4_cart_checkout',
  },
  {
    up: migration_20261112_031137_step4_checkout_shipping_address.up,
    down: migration_20261112_031137_step4_checkout_shipping_address.down,
    name: '20261112_031137_step4_checkout_shipping_address',
  },
  {
    up: migration_20261113_154016_step5_product_editorial.up,
    down: migration_20261113_154016_step5_product_editorial.down,
    name: '20261113_154016_step5_product_editorial',
  },
  {
    up: migration_20261115_163925_step6_product_sections.up,
    down: migration_20261115_163925_step6_product_sections.down,
    name: '20261115_163925_step6_product_sections',
  },
  {
    up: migration_20261116_040253_step7_product_explorer.up,
    down: migration_20261116_040253_step7_product_explorer.down,
    name: '20261116_040253_step7_product_explorer'
  },
];

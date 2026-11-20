const { CATEGORIES } = require('./scanner');

const SAMPLE_DEMO_REPORT = {
  id: "audit-sample-bakery",
  url: "https://sample-bakery.example",
  domain: "sample-bakery.example",
  scannedAt: new Date().toISOString(),
  responseTimeMs: 640,
  contentLengthKb: 48.2,
  healthScore: 72,
  criticalCount: 3,
  needsCount: 5,
  goodCount: 7,
  summary: "Sample Bakery website scores 72/100. The layout is attractive and mobile-friendly, but broken contact paths and outdated opening hours are costing valuable weekly orders.",
  checks: [
    // Cat 1
    {
      id: "c1_1",
      category: CATEGORIES[0],
      name: "Broken links & link structure",
      status: "Critical",
      priority: "Critical",
      detail: "The primary 'Contact & Order' menu link points to /order-old.html which returns a 404 Not Found error.",
      recommendation: "Update the contact link to the active /order form destination immediately."
    },
    {
      id: "c1_2",
      category: CATEGORIES[0],
      name: "Working navigation links",
      status: "Good",
      priority: "Passed",
      detail: "Top header navigation is clean, responsive, and contains 5 direct links to core offerings.",
      recommendation: "Maintain simplicity and keep menu links under 7 items."
    },
    {
      id: "c1_3",
      category: CATEGORIES[0],
      name: "Button & form functionality",
      status: "Needs",
      priority: "Medium",
      detail: "The custom cake inquiry form button does not show a loading indicator or confirmation message on mobile.",
      recommendation: "Add an instant thank-you confirmation toast when visitors submit an inquiry."
    },

    // Cat 2
    {
      id: "c2_1",
      category: CATEGORIES[1],
      name: "Phone number accuracy & click-to-call",
      status: "Good",
      priority: "Passed",
      detail: "Phone number is wrapped in a clickable 'tel:+919822011223' link on the header.",
      recommendation: "Ensure phone lines are answered during stated morning baking hours."
    },
    {
      id: "c2_2",
      category: CATEGORIES[1],
      name: "Email availability",
      status: "Good",
      priority: "Passed",
      detail: "Official orders email address (orders@samplebakery.in) is clearly present in footer.",
      recommendation: "Enable automated email receipt confirmation for custom cake orders."
    },
    {
      id: "c2_3",
      category: CATEGORIES[1],
      name: "Address and location information",
      status: "Needs",
      priority: "High",
      detail: "Address text is written without landmark, and the embedded Google Map is missing.",
      recommendation: "Add full street address, nearest landmark, and embed an interactive Google Map."
    },

    // Cat 3
    {
      id: "c3_1",
      category: CATEGORIES[2],
      name: "Updated information & copyright",
      status: "Critical",
      priority: "Critical",
      detail: "Business hours list Monday as closed, but the bakery now operates 7 days a week. Copyright states 2021.",
      recommendation: "Update operating hours immediately and refresh copyright year to 2026."
    },
    {
      id: "c3_2",
      category: CATEGORIES[2],
      name: "Missing essential content pages",
      status: "Needs",
      priority: "High",
      detail: "No dedicated page for allergen information, dietary options (eggless, gluten-free), or pricing guide.",
      recommendation: "Add an FAQ section addressing eggless options and pre-order delivery policies."
    },
    {
      id: "c3_3",
      category: CATEGORIES[2],
      name: "Clear service descriptions",
      status: "Good",
      priority: "Passed",
      detail: "Homepage features mouth-watering descriptions and clear highlights of signature artisan sourdoughs.",
      recommendation: "Keep seasonal flavor rotations highlighted at the top."
    },

    // Cat 4
    {
      id: "c4_1",
      category: CATEGORIES[3],
      name: "Mobile-friendly layout",
      status: "Good",
      priority: "Passed",
      detail: "Responsive viewport is configured. Layout flows naturally on both Android and iOS devices.",
      recommendation: "Continue checking layout after adding large promotional images."
    },
    {
      id: "c4_2",
      category: CATEGORIES[3],
      name: "Clear page structure & headings",
      status: "Needs",
      priority: "Medium",
      detail: "4 menu item images lack descriptive 'alt' tags, affecting image search ranking.",
      recommendation: "Add alt text describing each pastry (e.g. 'Fresh Belgian Dark Chocolate Croissant')."
    },
    {
      id: "c4_3",
      category: CATEGORIES[3],
      name: "Page speed & performance",
      status: "Good",
      priority: "Passed",
      detail: "Page loads under 640ms with optimized lightweight assets.",
      recommendation: "Use WebP image formats for all newly uploaded dessert photos."
    },

    // Cat 5
    {
      id: "c5_1",
      category: CATEGORIES[4],
      name: "Clear calls to action (CTA)",
      status: "Needs",
      priority: "Medium",
      detail: "The homepage CTA says 'Learn More' instead of high-intent 'Order Online' or 'WhatsApp Us'.",
      recommendation: "Change hero CTA to 'Order on WhatsApp' or 'Book a Custom Cake' for higher conversion."
    },
    {
      id: "c5_2",
      category: CATEGORIES[4],
      name: "Security & SSL encryption",
      status: "Good",
      priority: "Passed",
      detail: "Valid SSL certificate active, HTTPS redirect enforced.",
      recommendation: "Ensure auto-renewal is active."
    },
    {
      id: "c5_3",
      category: CATEGORIES[4],
      name: "Trust-building elements & social proof",
      status: "Critical",
      priority: "Critical",
      detail: "No Google reviews or customer ratings displayed, and the Instagram link icon is disconnected.",
      recommendation: "Embed 3-5 top Google 5-star reviews and connect the live Instagram gallery feed."
    }
  ],
  prioritizedIssues: [
    {
      id: "c1_1",
      category: CATEGORIES[0],
      name: "Broken contact destination link",
      status: "Critical",
      priority: "Critical",
      detail: "The primary 'Contact & Order' menu link points to /order-old.html returning a 404.",
      recommendation: "Update the contact link destination to the active order page immediately."
    },
    {
      id: "c3_1",
      category: CATEGORIES[2],
      name: "Outdated business hours & stale copyright",
      status: "Critical",
      priority: "Critical",
      detail: "Hours state Monday closed though open; copyright says 2021.",
      recommendation: "Update operating hours immediately and refresh copyright to 2026."
    },
    {
      id: "c5_3",
      category: CATEGORIES[4],
      name: "No customer reviews or social proof",
      status: "Critical",
      priority: "Critical",
      detail: "No Google reviews shown, Instagram icon has disconnected link.",
      recommendation: "Display 5-star customer testimonials and connect active Instagram profile."
    },
    {
      id: "c2_3",
      category: CATEGORIES[1],
      name: "Incomplete address and missing map",
      status: "Needs",
      priority: "High",
      detail: "Street address lacks landmark; no Google Maps embed.",
      recommendation: "Add full address with landmark and embed an interactive Google Map."
    },
    {
      id: "c3_2",
      category: CATEGORIES[2],
      name: "Missing allergen & dietary FAQ section",
      status: "Needs",
      priority: "High",
      detail: "No eggless/gluten-free disclosures or pricing FAQ.",
      recommendation: "Add a clear FAQ addressing custom cake ordering and dietary options."
    },
    {
      id: "c1_3",
      category: CATEGORIES[0],
      name: "Inquiry form lacks mobile confirmation",
      status: "Needs",
      priority: "Medium",
      detail: "Form lacks visual confirmation on submission.",
      recommendation: "Add an instant thank-you confirmation popup."
    },
    {
      id: "c4_2",
      category: CATEGORIES[3],
      name: "Missing image alt tags",
      status: "Needs",
      priority: "Medium",
      detail: "4 pastry images lack alt text descriptions.",
      recommendation: "Add descriptive alt tags to enhance SEO and accessibility."
    },
    {
      id: "c5_1",
      category: CATEGORIES[4],
      name: "Weak Call-to-Action phrasing",
      status: "Needs",
      priority: "Medium",
      detail: "Button says 'Learn More' instead of direct conversion action.",
      recommendation: "Change button text to 'Order on WhatsApp' or 'Pre-order Now'."
    }
  ]
};

module.exports = {
  SAMPLE_DEMO_REPORT
};

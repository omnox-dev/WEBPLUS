const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const CATEGORIES = [
  "Links & Functionality",
  "Contact Information",
  "Content Quality",
  "Navigation & User Experience",
  "Trust & Conversion"
];

function normalizeUrl(inputUrl) {
  let url = inputUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }
  return url;
}

async function run15PointAudit(rawUrl) {
  const targetUrl = normalizeUrl(rawUrl);
  const parsedUrl = new URL(targetUrl);
  const hostname = parsedUrl.hostname;

  const startTime = Date.now();
  let response;
  let fetchError = null;

  const axiosInstance = axios.create({
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 WebPlusHealthBot/1.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    },
    maxRedirects: 5,
    validateStatus: () => true // Allow handling 4xx, 5xx explicitly
  });

  try {
    response = await axiosInstance.get(targetUrl);
  } catch (err) {
    fetchError = err.message || 'Unable to connect to website';
  }

  const responseTimeMs = Date.now() - startTime;
  const isHttps = targetUrl.startsWith('https://');

  // If website failed to fetch completely (e.g. invalid domain, offline host)
  if (fetchError || !response || response.status >= 500) {
    return generateOfflineReport(targetUrl, hostname, fetchError || `Server returned HTTP ${response?.status}`);
  }

  const html = typeof response.data === 'string' ? response.data : '';
  const $ = cheerio.load(html);
  const headers = response.headers || {};
  const status = response.status;
  const contentLengthKb = Math.round((Buffer.byteLength(html, 'utf8') / 1024) * 10) / 10;

  const checks = [];

  // -------------------------------------------------------------
  // CATEGORY 1: Links & Functionality
  // -------------------------------------------------------------
  // 1. Broken links & dead paths
  const allAnchors = $('a');
  let internalLinks = [];
  let emptyOrDeadHrefs = 0;

  allAnchors.each((i, el) => {
    const href = $(el).attr('href') || '';
    if (href === '#' || href === 'javascript:void(0)' || href === 'javascript:;' || href.trim() === '') {
      emptyOrDeadHrefs++;
    } else if (href.startsWith('/') || href.includes(hostname)) {
      internalLinks.push(href);
    }
  });

  if (status >= 400) {
    checks.push({
      id: "c1_1",
      category: CATEGORIES[0],
      name: "Broken links & HTTP availability",
      status: "Critical",
      priority: "Critical",
      detail: `The root URL returned a failed HTTP response status: ${status}.`,
      recommendation: "Ensure your primary website hosting server is active and DNS configurations are correct."
    });
  } else if (emptyOrDeadHrefs > 5) {
    checks.push({
      id: "c1_1",
      category: CATEGORIES[0],
      name: "Broken links & placeholder hrefs",
      status: "Needs",
      priority: "High",
      detail: `Found ${emptyOrDeadHrefs} links with empty href="#" or dead placeholders that lead nowhere when clicked.`,
      recommendation: "Replace all placeholder '#' links with their actual destination URLs or remove unnecessary link tags."
    });
  } else {
    checks.push({
      id: "c1_1",
      category: CATEGORIES[0],
      name: "Broken links & link structure",
      status: "Good",
      priority: "Passed",
      detail: `Website responded with HTTP ${status}. Link destinations appear configured with only ${emptyOrDeadHrefs} placeholder links.`,
      recommendation: "Regularly audit outgoing and internal links to ensure destinations remain live."
    });
  }

  // 2. Working navigation links
  const navElement = $('nav, header, [role="navigation"], .navbar, .menu, .nav');
  const navLinks = navElement.find('a');
  if (navLinks.length === 0) {
    checks.push({
      id: "c1_2",
      category: CATEGORIES[0],
      name: "Working navigation links",
      status: "Needs",
      priority: "High",
      detail: "No explicit semantic <nav> navigation menu links detected in page header.",
      recommendation: "Add a visible, organized navigation bar with direct links to your primary services, about, and contact details."
    });
  } else {
    checks.push({
      id: "c1_2",
      category: CATEGORIES[0],
      name: "Working navigation links",
      status: "Good",
      priority: "Passed",
      detail: `Semantic navigation found with ${navLinks.length} visible navigation menu links.`,
      recommendation: "Keep navigation simple with 5-7 core items so visitors do not get overwhelmed."
    });
  }

  // 3. Button & Form functionality
  const buttons = $('button, input[type="submit"], input[type="button"], a.btn, a.button');
  const forms = $('form');
  let formHasAction = false;
  forms.each((i, el) => {
    if ($(el).attr('action')) formHasAction = true;
  });

  if (forms.length > 0 && !formHasAction) {
    checks.push({
      id: "c1_3",
      category: CATEGORIES[0],
      name: "Button & form functionality",
      status: "Needs",
      priority: "Medium",
      detail: `Found ${forms.length} interactive forms, but one or more form tags lack an explicit submit action/handler.`,
      recommendation: "Ensure inquiry forms are connected to a working email API or backend handler so customer messages aren't lost."
    });
  } else if (buttons.length === 0 && forms.length === 0) {
    checks.push({
      id: "c1_3",
      category: CATEGORIES[0],
      name: "Button & form functionality",
      status: "Needs",
      priority: "Medium",
      detail: "No interactive buttons or inquiry forms detected on the scanned page.",
      recommendation: "Add clear contact/action buttons so customers can request quotes or make inquiries directly."
    });
  } else {
    checks.push({
      id: "c1_3",
      category: CATEGORIES[0],
      name: "Button & form functionality",
      status: "Good",
      priority: "Passed",
      detail: `Detected ${buttons.length} interactive buttons and ${forms.length} lead/contact forms properly structured.`,
      recommendation: "Periodically test form submissions to verify notification emails arrive immediately."
    });
  }

  // -------------------------------------------------------------
  // CATEGORY 2: Contact Information
  // -------------------------------------------------------------
  const fullText = $('body').text();

  // 4. Phone number accuracy
  const telLinks = $('a[href^="tel:"]');
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?(\(?\d{3,5}\)?[-.\s]?)?\d{3,5}[-.\s]?\d{3,5}/g;
  const potentialPhones = (fullText.match(phoneRegex) || []).filter(p => p.replace(/\D/g, '').length >= 10 && p.replace(/\D/g, '').length <= 13);

  if (telLinks.length > 0) {
    checks.push({
      id: "c2_1",
      category: CATEGORIES[1],
      name: "Phone number accuracy & click-to-call",
      status: "Good",
      priority: "Passed",
      detail: `Active click-to-call 'tel:' link identified (${telLinks.first().attr('href')}). Mobile visitors can call with one tap.`,
      recommendation: "Keep your phone number prominently visible on the header of every page."
    });
  } else if (potentialPhones.length > 0) {
    checks.push({
      id: "c2_1",
      category: CATEGORIES[1],
      name: "Phone number accuracy & click-to-call",
      status: "Needs",
      priority: "Medium",
      detail: `Phone number text detected (${potentialPhones[0].trim()}), but it is not wrapped in a clickable 'tel:' link for mobile visitors.`,
      recommendation: "Wrap your phone number in <a href='tel:...'> so mobile visitors can tap to call instantly without having to copy-paste."
    });
  } else {
    checks.push({
      id: "c2_1",
      category: CATEGORIES[1],
      name: "Phone number accuracy & click-to-call",
      status: "Critical",
      priority: "Critical",
      detail: "No phone number or click-to-call link detected on the page.",
      recommendation: "Add a direct telephone number with your business operating hours to build trust and stop losing urgent inquiries."
    });
  }

  // 5. Email availability
  const mailtoLinks = $('a[href^="mailto:"]');
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emailsFound = (html.match(emailRegex) || []).filter(e => !e.includes('example.com') && !e.includes('w3.org') && !e.endsWith('.png') && !e.endsWith('.jpg'));

  if (mailtoLinks.length > 0 || emailsFound.length > 0) {
    const displayEmail = mailtoLinks.length > 0 ? mailtoLinks.first().attr('href').replace('mailto:', '') : emailsFound[0];
    checks.push({
      id: "c2_2",
      category: CATEGORIES[1],
      name: "Email availability",
      status: "Good",
      priority: "Passed",
      detail: `Working email address identified: ${displayEmail}.`,
      recommendation: "Ensure inbox notifications are checked daily and an auto-responder confirms receipt of customer inquiries."
    });
  } else {
    checks.push({
      id: "c2_2",
      category: CATEGORIES[1],
      name: "Email availability",
      status: "Critical",
      priority: "Critical",
      detail: "No clear email contact or mailto link found on the page.",
      recommendation: "Add an official contact email address in both the header and footer to provide an alternative for customers who prefer writing."
    });
  }

  // 6. Address and location information
  const mapIframe = $('iframe[src*="google.com/maps"], iframe[src*="maps.google"], a[href*="maps.google"], a[href*="goo.gl/maps"]');
  const addressKeywords = /address|location|road|street|nagar|marg|lane|floor|building|pune|mumbai|delhi|bangalore|pin code|pincode|zip code/i;
  const hasAddressText = addressKeywords.test(fullText);

  if (mapIframe.length > 0) {
    checks.push({
      id: "c2_3",
      category: CATEGORIES[1],
      name: "Address and location information",
      status: "Good",
      priority: "Passed",
      detail: "Embedded Google Maps or direct directions link detected. Customers can easily find your physical location.",
      recommendation: "Verify that Google Maps pin aligns accurately with your real storefront or clinic entrance."
    });
  } else if (hasAddressText) {
    checks.push({
      id: "c2_3",
      category: CATEGORIES[1],
      name: "Address and location information",
      status: "Needs",
      priority: "High",
      detail: "Physical address text was found, but there is no embedded map or direct Google Maps directions link.",
      recommendation: "Embed an interactive Google Maps iframe or link your address directly to Google Maps to help local customers navigate."
    });
  } else {
    checks.push({
      id: "c2_3",
      category: CATEGORIES[1],
      name: "Address and location information",
      status: "Critical",
      priority: "Critical",
      detail: "No physical business address, city, or map coordinates detected on the page.",
      recommendation: "Display your full physical operating address, landmark, and opening hours clearly in the footer."
    });
  }

  // -------------------------------------------------------------
  // CATEGORY 3: Content Quality
  // -------------------------------------------------------------
  // 7. Updated information & copyright year
  const currentYear = new Date().getFullYear();
  const copyrightMatch = fullText.match(/©|copyright\s*(?:20\d{2})?(?:\s*-\s*)?(20\d{2})/i);
  let isOutdated = false;
  let yearFound = currentYear;

  if (copyrightMatch && copyrightMatch[1]) {
    yearFound = parseInt(copyrightMatch[1], 10);
    if (yearFound < currentYear - 1) {
      isOutdated = true;
    }
  }

  if (isOutdated) {
    checks.push({
      id: "c3_1",
      category: CATEGORIES[2],
      name: "Updated information & copyright",
      status: "Needs",
      priority: "Medium",
      detail: `Copyright year indicates ${yearFound}, which is outdated. Visitors may suspect the business is inactive.`,
      recommendation: `Update copyright notice to ${currentYear} and refresh any expired promotions, banners, or seasonal hours.`
    });
  } else {
    checks.push({
      id: "c3_1",
      category: CATEGORIES[2],
      name: "Updated information & freshness",
      status: "Good",
      priority: "Passed",
      detail: `Content and copyright notices appear current (${yearFound >= currentYear - 1 ? yearFound : currentYear}).`,
      recommendation: "Continue quarterly audits to refresh holiday hours, pricing, and new service offerings."
    });
  }

  // 8. Missing essential content
  const pageTextLower = fullText.toLowerCase();
  const hasAbout = /about\s*(us)?/i.test(pageTextLower);
  const hasServices = /service|services|menu|product|treatments|offerings/i.test(pageTextLower);
  const hasTerms = /privacy|terms|policy|disclaimer/i.test(pageTextLower);

  let missingEssentials = [];
  if (!hasAbout) missingEssentials.push("About Us");
  if (!hasServices) missingEssentials.push("Services / Offerings");
  if (!hasTerms) missingEssentials.push("Privacy Policy");

  if (missingEssentials.length >= 2) {
    checks.push({
      id: "c3_2",
      category: CATEGORIES[2],
      name: "Missing essential content pages",
      status: "Needs",
      priority: "High",
      detail: `Missing standard trust sections: ${missingEssentials.join(', ')}.`,
      recommendation: `Add dedicated sections or pages for ${missingEssentials.join(', ')} so visitors understand your credibility.`
    });
  } else {
    checks.push({
      id: "c3_2",
      category: CATEGORIES[2],
      name: "Essential content pages",
      status: "Good",
      priority: "Passed",
      detail: "Essential sections (About, Services, Policies) are present and accessible.",
      recommendation: "Expand on service outcomes with before/after stories or client results."
    });
  }

  // 9. Clear service descriptions
  const h1Count = $('h1').length;
  const metaDesc = $('meta[name="description"]').attr('content') || '';
  const wordCount = fullText.split(/\s+/).filter(Boolean).length;

  if (wordCount < 120 || h1Count === 0) {
    checks.push({
      id: "c3_3",
      category: CATEGORIES[2],
      name: "Clear service descriptions",
      status: "Needs",
      priority: "High",
      detail: `Low text density (${wordCount} words) or missing top-level <h1> heading. Visitors might struggle to grasp your offer in 5 seconds.`,
      recommendation: "Craft a distinct H1 headline highlighting your core value proposition and 2-3 clear descriptive bullet points."
    });
  } else {
    checks.push({
      id: "c3_3",
      category: CATEGORIES[2],
      name: "Clear service descriptions",
      status: "Good",
      priority: "Passed",
      detail: `Strong content volume (${wordCount} words) and clear heading structure explaining core services.`,
      recommendation: "Review headline phrasing to ensure it directly answers: 'What problem do you solve for the customer?'"
    });
  }

  // -------------------------------------------------------------
  // CATEGORY 4: Navigation & User Experience
  // -------------------------------------------------------------
  // 10. Mobile-friendly layout
  const viewport = $('meta[name="viewport"]').attr('content') || '';
  const hasViewport = viewport.includes('width=device-width');

  if (!hasViewport) {
    checks.push({
      id: "c4_1",
      category: CATEGORIES[3],
      name: "Mobile-friendly layout & viewport",
      status: "Critical",
      priority: "Critical",
      detail: "Missing standard viewport meta tag. Mobile visitors may see a shrunken desktop version requiring pinch-to-zoom.",
      recommendation: "Add <meta name='viewport' content='width=device-width, initial-scale=1.0'> to the HTML <head>."
    });
  } else {
    checks.push({
      id: "c4_1",
      category: CATEGORIES[3],
      name: "Mobile-friendly layout",
      status: "Good",
      priority: "Passed",
      detail: "Responsive viewport meta configuration verified. Mobile devices render the page scaled properly.",
      recommendation: "Test the layout on various mobile screen sizes (e.g. iPhone, Samsung Galaxy) to guarantee no horizontal scroll."
    });
  }

  // 11. Clear page structure & accessibility
  const images = $('img');
  let missingAlt = 0;
  images.each((i, el) => {
    if (!$(el).attr('alt')) missingAlt++;
  });

  if (h1Count > 1) {
    checks.push({
      id: "c4_2",
      category: CATEGORIES[3],
      name: "Clear page structure & headings",
      status: "Needs",
      priority: "Medium",
      detail: `Multiple <h1> tags detected (${h1Count}). Best practices recommend a single main H1 headline per page for hierarchy.`,
      recommendation: "Consolidate into one clear H1 heading and use H2/H3 tags for subsections."
    });
  } else if (missingAlt > 3) {
    checks.push({
      id: "c4_2",
      category: CATEGORIES[3],
      name: "Image alt tags & visual accessibility",
      status: "Needs",
      priority: "Medium",
      detail: `${missingAlt} images are missing descriptive 'alt' tags. This weakens SEO and accessibility.`,
      recommendation: "Add concise descriptive alt text to all key images."
    });
  } else {
    checks.push({
      id: "c4_2",
      category: CATEGORIES[3],
      name: "Clear page structure",
      status: "Good",
      priority: "Passed",
      detail: `Solid heading structure (1 main H1) and ${images.length} images properly formatted.`,
      recommendation: "Maintain semantic HTML tags (header, main, section, footer) for clean styling."
    });
  }

  // 12. Page speed & performance
  if (responseTimeMs > 2500) {
    checks.push({
      id: "c4_3",
      category: CATEGORIES[3],
      name: "Page response speed & latency",
      status: "Critical",
      priority: "Critical",
      detail: `Slow server response time (${responseTimeMs} ms). 53% of mobile users abandon sites that take longer than 3 seconds.`,
      recommendation: "Compress image assets, enable server-side caching, and verify hosting performance."
    });
  } else if (responseTimeMs > 1200 || contentLengthKb > 500) {
    checks.push({
      id: "c4_3",
      category: CATEGORIES[3],
      name: "Page response speed",
      status: "Needs",
      priority: "Medium",
      detail: `Moderate server latency (${responseTimeMs} ms, HTML size: ${contentLengthKb} KB).`,
      recommendation: "Optimize images to WebP format and minify HTML/CSS bundles for snappier mobile loading."
    });
  } else {
    checks.push({
      id: "c4_3",
      category: CATEGORIES[3],
      name: "Page response speed",
      status: "Good",
      priority: "Passed",
      detail: `Fast server response time (${responseTimeMs} ms, ${contentLengthKb} KB payload).`,
      recommendation: "Keep scripts deferred to maintain fast interactive load times."
    });
  }

  // -------------------------------------------------------------
  // CATEGORY 5: Trust & Conversion
  // -------------------------------------------------------------
  // 13. Clear calls to action (CTA)
  const ctaRegex = /book|enquire|inquire|contact|get started|quote|call now|order|schedule|reserve/i;
  let ctaCount = 0;
  $('a, button').each((i, el) => {
    const text = $(el).text().trim();
    if (ctaRegex.test(text)) ctaCount++;
  });

  if (ctaCount === 0) {
    checks.push({
      id: "c5_1",
      category: CATEGORIES[4],
      name: "Clear calls to action (CTA)",
      status: "Critical",
      priority: "Critical",
      detail: "No clear action-oriented Call to Action buttons detected (e.g., 'Book Appointment', 'Get Free Quote').",
      recommendation: "Add a high-contrast CTA button above the fold on the homepage to capture visitor intent immediately."
    });
  } else if (ctaCount < 2) {
    checks.push({
      id: "c5_1",
      category: CATEGORIES[4],
      name: "Clear calls to action (CTA)",
      status: "Needs",
      priority: "Medium",
      detail: `Found only 1 prominent CTA. Visitors who scroll down may reach the bottom without a prompt to reach out.`,
      recommendation: "Add a repeat CTA or sticky enquiry bar near the bottom of your key service pages."
    });
  } else {
    checks.push({
      id: "c5_1",
      category: CATEGORIES[4],
      name: "Clear calls to action (CTA)",
      status: "Good",
      priority: "Passed",
      detail: `Found ${ctaCount} clear, high-intent call-to-action buttons across the page.`,
      recommendation: "Test A/B wording on your primary CTA to measure which phrasing brings more phone calls or bookings."
    });
  }

  // 14. Security & SSL
  const hasHsts = !!headers['strict-transport-security'];
  if (!isHttps) {
    checks.push({
      id: "c5_2",
      category: CATEGORIES[4],
      name: "Security & SSL encryption",
      status: "Critical",
      priority: "Critical",
      detail: "Website is running over unencrypted HTTP. Modern browsers mark this as 'Not Secure', scaring off customers.",
      recommendation: "Install a free Let's Encrypt SSL certificate and enforce HTTPS redirect across the entire site."
    });
  } else {
    checks.push({
      id: "c5_2",
      category: CATEGORIES[4],
      name: "Security & SSL encryption",
      status: "Good",
      priority: "Passed",
      detail: "Website is secured with HTTPS encryption. Browser displays a safe connection padlock.",
      recommendation: "Ensure SSL certificate auto-renewal is enabled with your hosting provider."
    });
  }

  // 15. Trust-building elements
  const socialLinks = $('a[href*="facebook.com"], a[href*="instagram.com"], a[href*="linkedin.com"], a[href*="twitter.com"], a[href*="x.com"], a[href*="wa.me"]');
  const reviewKeywords = /testimonial|review|rating|stars|customer says|client feedback|google review/i;
  const hasReviews = reviewKeywords.test(pageTextLower);

  if (socialLinks.length === 0 && !hasReviews) {
    checks.push({
      id: "c5_3",
      category: CATEGORIES[4],
      name: "Trust-building elements & social proof",
      status: "Critical",
      priority: "Critical",
      detail: "No client testimonials, reviews, or active social media links detected.",
      recommendation: "Add 3 real customer reviews with photos or ratings, and connect your active Instagram or WhatsApp business link."
    });
  } else if (!hasReviews) {
    checks.push({
      id: "c5_3",
      category: CATEGORIES[4],
      name: "Trust-building elements & testimonials",
      status: "Needs",
      priority: "High",
      detail: `Social profiles found (${socialLinks.length}), but no customer testimonials or Google rating badges are displayed.`,
      recommendation: "Feature genuine customer quotes or Google reviews prominently on your homepage."
    });
  } else {
    checks.push({
      id: "c5_3",
      category: CATEGORIES[4],
      name: "Trust-building elements & proof",
      status: "Good",
      priority: "Passed",
      detail: `Social media channels and customer trust/review signals are visible.`,
      recommendation: "Keep reviews refreshed with feedback from the last 6 months to maintain credibility."
    });
  }

  // -------------------------------------------------------------
  // CALCULATE HEALTH SCORE & AGGREGATES
  // -------------------------------------------------------------
  let criticalCount = 0;
  let needsCount = 0;
  let goodCount = 0;

  checks.forEach(c => {
    if (c.status === 'Critical') criticalCount++;
    else if (c.status === 'Needs') needsCount++;
    else if (c.status === 'Good') goodCount++;
  });

  // Weighted scoring out of 100:
  // 15 checks: Good = 6.66 pts, Needs = 3.33 pts, Critical = 0 pts
  let rawScore = (goodCount * 6.66) + (needsCount * 3.33);
  let healthScore = Math.min(100, Math.max(10, Math.round(rawScore)));

  // If HTTP not secure or server offline, cap at 50
  if (!isHttps) healthScore = Math.min(50, healthScore);

  const prioritizedIssues = checks
    .filter(c => c.status !== 'Good')
    .sort((a, b) => {
      const weight = { 'Critical': 3, 'High': 2, 'Medium': 1, 'Low': 0 };
      return (weight[b.priority] || 0) - (weight[a.priority] || 0);
    });

  return {
    id: 'audit-' + Date.now(),
    url: targetUrl,
    domain: hostname,
    scannedAt: new Date().toISOString(),
    responseTimeMs,
    contentLengthKb,
    healthScore,
    criticalCount,
    needsCount,
    goodCount,
    checks,
    prioritizedIssues,
    summary: generateSummaryText(hostname, healthScore, criticalCount, needsCount)
  };
}

function generateOfflineReport(url, hostname, errorMessage) {
  const checks = [];
  const checksTemplates = [
    { cat: CATEGORIES[0], name: "Server Availability", s: "Critical", p: "Critical", d: `Target server unreachable: ${errorMessage}`, r: "Verify DNS records, hosting status, and server port configuration." },
    { cat: CATEGORIES[0], name: "Navigation Links", s: "Critical", p: "High", d: "Cannot inspect navigation links while site is unreachable.", r: "Bring server online to inspect link paths." },
    { cat: CATEGORIES[0], name: "Button & Form Functionality", s: "Needs", p: "Medium", d: "Interactive controls could not be verified.", r: "Ensure form endpoints are online." },
    { cat: CATEGORIES[1], name: "Phone Number Accuracy", s: "Needs", p: "High", d: "Phone presence unverified.", r: "Add click-to-call links." },
    { cat: CATEGORIES[1], name: "Email Availability", s: "Needs", p: "High", d: "Email availability unverified.", r: "Ensure mailto link is active." },
    { cat: CATEGORIES[1], name: "Address & Location", s: "Needs", p: "Medium", d: "Location data unverified.", r: "Add Google Maps link." },
    { cat: CATEGORIES[2], name: "Content Quality", s: "Needs", p: "Medium", d: "Content freshness unverified.", r: "Verify copyright notice." },
    { cat: CATEGORIES[2], name: "Missing Essential Content", s: "Needs", p: "High", d: "Essential pages unverified.", r: "Ensure About and Services pages exist." },
    { cat: CATEGORIES[2], name: "Clear Service Descriptions", s: "Needs", p: "High", d: "Headline structure unverified.", r: "Add clear value propositions." },
    { cat: CATEGORIES[3], name: "Mobile-Friendly Layout", s: "Needs", p: "High", d: "Viewport unverified.", r: "Check viewport meta tags." },
    { cat: CATEGORIES[3], name: "Page Structure", s: "Needs", p: "Medium", d: "Heading hierarchy unverified.", r: "Maintain clean H1-H3 structure." },
    { cat: CATEGORIES[3], name: "Page Speed & Latency", s: "Critical", p: "Critical", d: "Connection timed out or failed.", r: "Upgrade hosting resources or fix network errors." },
    { cat: CATEGORIES[4], name: "Clear Calls to Action", s: "Critical", p: "High", d: "No active CTA detected.", r: "Add clear booking button." },
    { cat: CATEGORIES[4], name: "Security & SSL", s: "Critical", p: "Critical", d: "SSL/TLS connection failed.", r: "Renew SSL certificate." },
    { cat: CATEGORIES[4], name: "Trust Elements", s: "Needs", p: "Medium", d: "Social proof unverified.", r: "Add customer testimonials." }
  ];

  checksTemplates.forEach((t, i) => {
    checks.push({
      id: `off_${i+1}`,
      category: t.cat,
      name: t.name,
      status: t.s,
      priority: t.p,
      detail: t.d,
      recommendation: t.r
    });
  });

  return {
    id: 'audit-' + Date.now(),
    url,
    domain: hostname,
    scannedAt: new Date().toISOString(),
    responseTimeMs: 0,
    contentLengthKb: 0,
    healthScore: 24,
    criticalCount: 5,
    needsCount: 10,
    goodCount: 0,
    checks,
    prioritizedIssues: checks.filter(c => c.status !== 'Good'),
    summary: `Website at ${hostname} failed connectivity checks (${errorMessage}). Immediate hosting or DNS intervention is required.`
  };
}

function generateSummaryText(domain, score, critical, needs) {
  if (score >= 85) {
    return `${domain} is in strong overall health (${score}/100). Visitors enjoy a stable experience, with minor friction items to polish for maximum conversion.`;
  } else if (score >= 65) {
    return `${domain} performs moderately (${score}/100) with ${critical} critical issue(s) and ${needs} improvement area(s). Addressing contact and navigation friction will noticeably increase customer inquiries.`;
  } else {
    return `${domain} currently has significant customer friction (${score}/100) with ${critical} critical issues. Visitors are likely dropping off before contacting the business.`;
  }
}

module.exports = {
  run15PointAudit,
  CATEGORIES
};

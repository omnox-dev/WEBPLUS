/**
 * WEB PLUS - MongoDB Schema & Data Models Specification
 * 
 * Collections:
 * 1. audits: Stores real 15-point scan results, scores, and issue logs.
 * 2. leads: Stores client service bookings and correction package inquiries.
 * 3. discovery_conversations: Stores the 15 customer discovery interviews (Slide 05).
 * 4. channel_metrics: Stores outreach funnel data across WhatsApp, LinkedIn, Email, Groups (Slide 08).
 * 5. experiment_settings: Stores pass/kill thresholds and targets (Slide 06 & 09).
 */

const AuditSchema = {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["domain", "url", "healthScore", "checks", "scannedAt"],
      properties: {
        domain: { bsonType: "string" },
        url: { bsonType: "string" },
        healthScore: { bsonType: "int", minimum: 0, maximum: 100 },
        responseTimeMs: { bsonType: "int" },
        contentLengthKb: { bsonType: "number" },
        criticalCount: { bsonType: "int" },
        needsCount: { bsonType: "int" },
        goodCount: { bsonType: "int" },
        summary: { bsonType: "string" },
        checks: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["id", "category", "name", "status", "priority", "detail", "recommendation"],
            properties: {
              id: { bsonType: "string" },
              category: { bsonType: "string" },
              name: { bsonType: "string" },
              status: { enum: ["Good", "Needs", "Critical"] },
              priority: { enum: ["Passed", "Medium", "High", "Critical"] },
              detail: { bsonType: "string" },
              recommendation: { bsonType: "string" }
            }
          }
        },
        scannedAt: { bsonType: "date" }
      }
    }
  }
};

const LeadSchema = {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "email", "package", "status", "createdAt"],
      properties: {
        name: { bsonType: "string" },
        email: { bsonType: "string" },
        phone: { bsonType: "string" },
        site: { bsonType: "string" },
        package: { enum: ["Starter", "Professional", "Correction Package"] },
        status: { enum: ["New", "Contacted", "Audited", "Closed", "Lost"] },
        notes: { bsonType: "string" },
        auditId: { bsonType: ["string", "null"] },
        createdAt: { bsonType: "date" }
      }
    }
  }
};

const DiscoveryConversationSchema = {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["interviewer", "customerName", "incidentProblem", "hadPainAndTriedToFix", "date"],
      properties: {
        interviewer: { bsonType: "string" },
        customerName: { bsonType: "string" },
        businessType: { bsonType: "string" },
        date: { bsonType: "string" },
        incidentProblem: { bsonType: "string" },
        currentFix: { bsonType: "string" },
        exactQuotes: { bsonType: "string" },
        hadPainAndTriedToFix: { bsonType: "bool" },
        createdAt: { bsonType: "date" }
      }
    }
  }
};

const ChannelMetricSchema = {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["channel", "sawIt", "stoppedAsked", "committed"],
      properties: {
        channel: { bsonType: "string" },
        sawIt: { bsonType: "int", minimum: 0 },
        stoppedAsked: { bsonType: "int", minimum: 0 },
        committed: { bsonType: "int", minimum: 0 },
        updatedAt: { bsonType: "date" }
      }
    }
  }
};

module.exports = {
  AuditSchema,
  LeadSchema,
  DiscoveryConversationSchema,
  ChannelMetricSchema
};

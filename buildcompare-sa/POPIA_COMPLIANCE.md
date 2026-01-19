# POPIA Compliance Documentation

## Protection of Personal Information Act (POPIA)

BuildCompare SA is committed to complying with the Protection of Personal Information Act, 2013 (POPIA) of South Africa.

---

## 1. Data We Collect

| Data Type | Purpose | Retention |
|-----------|---------|-----------|
| Email Address | Account authentication | Until account deletion |
| User Role | Access control (Contractor/Supplier) | Until account deletion |
| Project Data | Core functionality | Until user deletes project |
| Session Tokens | Authentication | 1 hour (auto-refresh) |

**We do NOT collect:**
- National ID numbers
- Physical addresses (unless explicitly provided for delivery)
- Payment card details (handled by third-party processors)

---

## 2. Data Storage

| Component | Location | Provider |
|-----------|----------|----------|
| User Auth | Supabase Cloud | AWS (eu-west regions available) |
| Project Data | Supabase PostgreSQL | AWS |
| Rate Limit Data | In-memory only | Not persisted |
| AI Chat Logs | Not stored | Processed in real-time only |

> [!NOTE]
> Supabase allows region selection. For maximum POPIA compliance, select an EMEA region.

---

## 3. User Rights

Under POPIA, users have the following rights:

| Right | How We Support It |
|-------|-------------------|
| **Access** | Users can view all their data in the dashboard |
| **Correction** | Users can edit profile via settings |
| **Deletion** | Account deletion available via Supabase dashboard |
| **Objection** | Users can contact support to opt-out of processing |

---

## 4. Data Processing

### 4.1 Lawful Basis
- **Consent**: Users explicitly agree to terms during signup
- **Contract**: Processing necessary to provide the service

### 4.2 Third-Party Processors
| Processor | Purpose | Data Shared |
|-----------|---------|-------------|
| Supabase | Authentication & Database | Email, role |
| Google Gemini | AI Chat | Chat messages (not stored) |
| Groq | AI Processing | Queries (not stored) |

---

## 5. Security Measures

### Technical Safeguards
- ✅ TLS 1.3 encryption in transit
- ✅ Database encryption at rest
- ✅ Rate limiting to prevent abuse
- ✅ JWT authentication with short expiry
- ✅ Firebase App Check for API protection

### Organizational Safeguards
- Access to production data limited to authorized personnel
- Regular security reviews
- Incident response procedures in place

---

## 6. Data Breach Notification

In the event of a data breach:
1. Affected users will be notified within 72 hours
2. Information Regulator will be notified if breach poses risk
3. Remediation steps will be communicated

---

## 7. Contact Information

**Information Officer:**  
Email: privacy@buildcompare.co.za

**Information Regulator (South Africa):**  
Website: https://inforegulator.org.za

---

## 8. Policy Updates

This policy was last updated: **January 2026**

Users will be notified of material changes via email.

---

*Document Version: 1.0*  
*Created for: BuildCompare SA POPIA Compliance*

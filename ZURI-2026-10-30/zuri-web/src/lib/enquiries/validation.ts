export function validateEnquiry(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid enquiry.");
  const input = body as Record<string, unknown>;
  function field(key: string, max: number, required = false) {
    const value = input[key];
    if (value !== undefined && typeof value !== "string") throw new Error(`Invalid ${key}.`);
    const text = ((value as string | undefined) ?? "").trim();
    if ((required && !text) || text.length > max) throw new Error(`Please check ${key}.`);
    return text;
  }
  const name = field("name", 120, true);
  const email = field("email", 254, true);
  const phone = field("phone", 40, input.enquiryType !== "tech");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  if (phone && (!/^[+\d\s().-]+$/.test(phone) || phone.replace(/\D/g, "").length < 7)) throw new Error("Enter a valid phone number.");
  if (input.enquiryType !== undefined && input.enquiryType !== "tech") throw new Error("Invalid enquiry type.");
  if (input.enquiryType === "tech") {
    const service = field("service", 60);
    const allowed = ["partnership", "software", "business-technology", "ai-automation", "security", "training", "digital-marketing"];
    if (service && !allowed.includes(service)) throw new Error("Select a valid service.");
    const intent=field("contactIntent",30)||"technology";
    if(!["technology","general","pamoja","claim"].includes(intent))throw new Error("Invalid contact intent.");
    const label=intent==="claim"?"Pamoja manual claim request":intent==="pamoja"?"Pamoja participation request":intent==="general"?"General ZURI request":"Technology request";
    const message = field("message", 3500, true);
    return { name, email, phone, wedding_date: null, location: null, guest_count: null, package_interest: null, message: `${label}${service ? ` — ${service}` : ""}\n\n${message}` };
  }
  const weddingDate = field("weddingDate", 10);
  if (weddingDate && (!/^\d{4}-\d{2}-\d{2}$/.test(weddingDate) || Number.isNaN(Date.parse(weddingDate)) || new Date(weddingDate).toISOString().slice(0, 10) !== weddingDate)) throw new Error("Enter a valid wedding date.");
  const guestCount = field("guestCount", 40);
  const packageInterest = field("packageInterest", 80);
  if (guestCount && !["Under 100", "100-250", "250-500", "Over 500", "Not sure"].includes(guestCount)) throw new Error("Select a valid guest estimate.");
  if (packageInterest && !["Digital invitation", "Wedding website", "Wedding website with RSVP", "Custom experience"].includes(packageInterest)) throw new Error("Select a valid website option.");
  return { name, email, phone, wedding_date: weddingDate || null, location: field("location", 200) || null, guest_count: guestCount || null, package_interest: packageInterest || null, message: field("message", 4000) || null };
}

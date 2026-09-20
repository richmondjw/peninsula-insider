/** Private enquiries share the existing review inbox, never its publication path. */
export function isPrivateIntake(row) {
  return /^(CONTACT \(|BUSINESS SUBMISSION:|CORRECTION:|PARTNER ENQUIRY:)/.test(String(row?.title ?? ''))
    || /^Intake type: (general|accessibility|new-business|correction|partner-enquiry)\b/m.test(String(row?.body ?? ''));
}

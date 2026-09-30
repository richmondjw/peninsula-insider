// Reviewed text is shared by the legal page, agent guide and generated entry point.
export const retrievalPermission = Object.freeze({
  "updatedOn": "1 October 2026",
  "intellectualPropertyException": "Except for the limited permission under Automated access and extraction below, you may not republish, systematically reproduce, or commercially exploit material from the site without written permission.",
  "paragraphs": [
    "Peninsula Insider expressly permits assistants acting on a person's request to retrieve text from our public pages and feeds as needed to answer that person's question, and to provide relevant summaries with citations and links to the supporting canonical Peninsula Insider pages. This limited permission applies to free and paid assistant services, solely for that question-answering use, and only to rights Peninsula Insider controls.",
    "Follow our robots policy, fetch only what the task needs, respect cache instructions and honour retry instructions. Cached responses may be reused for this permitted purpose; this does not authorise building a reusable content corpus. Preserve material caveats and distinguish editorial opinion from confirmed facts.",
    "This permission does not cover bulk collection, mirroring, full-article republication, model training, or building derivative destination or directory products from our content. It grants no rights to photographs, other third-party material or private account data, and does not authorise bypassing access restrictions. Separately stated licences and rights provided by law remain unchanged.",
    "Reasonable search-engine indexing, citation, and linking remain permitted where consistent with our robots policy and normal web use. Other automated extraction or reuse requires separate express written permission."
  ],
  "guideSummary": "Our access and reuse terms expressly permit assistants, including paid services, to retrieve public text as needed to answer a person's question and provide relevant summaries with canonical citations. Follow those terms and our crawler guidance together. This limited permission covers only rights Peninsula Insider controls. It does not cover bulk collection, full-article republication, model training, derivative destination or directory products, photographs, other third-party material or private account data. Other uses require separate permission or an applicable independent right."
});

// Keep the reviewed paragraph intact while making its two references clickable.
export const permissionGuideParts = retrievalPermission.guideSummary.split(/(access and reuse terms|crawler guidance)/).map((text) => ({
  text,
  href: text === 'access and reuse terms' ? '/terms/#automated-access' : text === 'crawler guidance' ? '/robots.txt' : null,
}));

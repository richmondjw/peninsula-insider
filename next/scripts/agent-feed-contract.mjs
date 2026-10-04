// Both build and live audits enforce the published occurrence/availability/validity contract.
export function validateFeedItemList(feed) {
  const failures = [];
  const typedFeed = feed.schemaVersion === '1.2';
  for (const [index, event] of (feed.events ?? []).entries()) {
    const listItem = feed.itemListElement?.[index];
    const item = listItem?.item;
    // The 1.1 contract describes Event occurrences only. Version 1.2 also
    // contains availability and offer validity, which must not acquire Event
    // types or occurrence dates when represented in its ItemList.
    const kind = typedFeed ? event.contentKind : 'event';
    const meaning = { event: 'occurrence', experience: 'availability', offer: 'validity' }[kind];
    if (typedFeed && (!meaning || event.dateMeaning !== meaning)) {
      failures.push(`entry ${index + 1} has invalid contentKind/dateMeaning`);
    }
    const expectedType = kind === 'event' ? 'Event' : kind === 'offer' ? 'Offer' : 'Service';
    let datesAgree = false;
    if (kind === 'event') {
      datesAgree = item?.startDate === event.startDate && item?.endDate === event.endDate;
    } else if (kind === 'offer') {
      datesAgree = item?.validFrom === event.startDate && item?.validThrough === event.endDate &&
        !Object.hasOwn(item ?? {}, 'startDate') && !Object.hasOwn(item ?? {}, 'endDate');
    } else if (kind === 'experience') {
      datesAgree = ['startDate', 'endDate', 'validFrom', 'validThrough'].every(key => !Object.hasOwn(item ?? {}, key));
    }
    if (
      listItem?.['@type'] !== 'ListItem' ||
      listItem?.position !== index + 1 ||
      item?.['@type'] !== expectedType ||
      item?.url !== event.url ||
      !datesAgree ||
      (typedFeed && (item?.name !== event.title || item?.eventStatus !== event.eventStatus))
    ) {
      failures.push(`ItemList entry ${index + 1} disagrees with events payload`);
    }
    if (typedFeed && kind !== 'event' && (
      Object.hasOwn(event, 'eventStatus') || Object.hasOwn(item ?? {}, 'eventStatus') ||
      (event.weekendOccurrences ?? []).some(occurrence => Object.hasOwn(occurrence, 'eventStatus'))
    )) {
      failures.push(`non-event entry ${index + 1} has Event status`);
    }
  }
  return failures;
}

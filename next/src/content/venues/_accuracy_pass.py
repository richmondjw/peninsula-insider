import json, os, re, html, time, urllib.request, urllib.parse, urllib.error
from collections import defaultdict

BASE = '/home/node/.openclaw/workspace/peninsula-insider/next/src/content/venues'
PROGRESS = os.path.join(BASE, '_ACCURACY_PASS_PROGRESS.md')
SLUGS = '''alba-thermal-springs allis-wine-bar ashcombe-maze avani-wines azuma-japanese baillieu-vineyard balnarring-bakehouse balnarring-market balnarring-pub barmah-park-vineyard barmah-park barragunda-dining bass-and-flinders bistro-elba commonfolk-coffee crittenden-villas dexter-wines doot-doot-doot dromana-estate dromana-hotel elan-vineyard elgee-park endota-spa-mornington epicurean-red-hill flinders-general-store flinders-hotel flinders-sourdough foxeys-hangout garagiste green-olive-red-hill hillview-cottages hotel-sorrento hurley-vineyard jackalope jetty-road-brewery johnny-ripe kerri-greens kooyong la-baracca-tgallant laura-pt-leo lightfoot-wines lindenderry main-ridge-dairy main-ridge-estate many-little martha-s-table maxs-red-hill-estate merricks-estate merricks-general-wine-store montalto moorooduc-estate morning-sun mornington-farmers-market mornington-hotel mornington-peninsula-brewery mornington-peninsula-chocolates mornington-peninsula-cider mr-vincenzos nazaaray-estate ocean-eight onannon one-spa-racv-cape-schanck ouest-france-bistro pane-e-vino paradigm-hill paringa-estate peninsula-fresh-organics peninsula-hot-springs-glamping peninsula-hot-springs phaedrus-estate pho-rosebud pier-street-flinders pier-street-seafood point-leo-estate-villas point-leo-wine-terrace polperro-villas polperro port-phillip-estate-restaurant port-phillip-estate portsea-hotel prancing-horse-estate pt-leo-estate quealy-winemakers rare-hare red-gum-bbq red-hill-bakery red-hill-brewery red-hill-cheese red-hill-estate red-hill-market red-hill-truffles rocker rye-hotel scorpo-wines small-stone-pantry somers-general sorrento-bakery sorrento-coastal-retreat sorrento-gelato sorrento-hotel sourdough-kitchen st-andrews-beach-brewery stonier-wines stringers-sorrento t-gallant tedesca-osteria ten-minutes-by-tractor the-baths-sorrento the-bay-hotel-mornington the-continental-sorrento via-boffe'''.split()

UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
BLOCKED_DOMAINS = {
    'tripadvisor.com.au','tripadvisor.com','opentable.com.au','opentable.com','restaurantguru.com','agfg.com.au',
    'bestrestaurants.com.au','facebook.com','www.facebook.com','instagram.com','www.instagram.com','yellowpages.com.au',
    'australianplanet.com','findglocal.com','aussiefunadvisor.com','place-advisor.com','australia.chamberofcommerce.com',
    'all-opening-hours.com.au','www.all-opening-hours.com.au','visitvictoria.com','www.visitvictoria.com','sorrento.org.au',
    'yelp.com','zomato.com','restaurantji.com','ubereats.com','doordash.com'
}
FALLBACK_DOMAINS = [
    'all-opening-hours.com.au','www.all-opening-hours.com.au','yellowpages.com.au','www.yellowpages.com.au',
    'australianplanet.com','findglocal.com','australia.chamberofcommerce.com','www.visitvictoria.com','visitvictoria.com'
]
DAY_MAP = {
    'mo':'Monday','mon':'Monday','monday':'Monday',
    'tu':'Tuesday','tue':'Tuesday','tues':'Tuesday','tuesday':'Tuesday',
    'we':'Wednesday','wed':'Wednesday','wednesday':'Wednesday',
    'th':'Thursday','thu':'Thursday','thur':'Thursday','thurs':'Thursday','thursday':'Thursday',
    'fr':'Friday','fri':'Friday','friday':'Friday',
    'sa':'Saturday','sat':'Saturday','saturday':'Saturday',
    'su':'Sunday','sun':'Sunday','sunday':'Sunday'
}


def fetch(url, timeout=25):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = resp.read().decode('utf-8', 'ignore')
        return resp.geturl(), data


def domain(url):
    try:
        return urllib.parse.urlparse(url).netloc.lower().replace(':443','')
    except Exception:
        return ''


def unwrap_ddg(url):
    if url.startswith('//duckduckgo.com/l/?') or url.startswith('https://duckduckgo.com/l/?'):
        q = urllib.parse.urlparse('https:' + url if url.startswith('//') else url).query
        uddg = urllib.parse.parse_qs(q).get('uddg')
        if uddg:
            return urllib.parse.unquote(uddg[0])
    return url


def search(query, max_results=8):
    url = 'https://html.duckduckgo.com/html/?q=' + urllib.parse.quote(query)
    try:
        _, page = fetch(url, timeout=30)
    except Exception:
        return []
    out = []
    pattern = re.compile(r'<a rel="nofollow" class="result__a" href="(.*?)">(.*?)</a>(.*?)(?:<a class="result__snippet" href=".*?">(.*?)</a>)?', re.S)
    for m in pattern.finditer(page):
        href = unwrap_ddg(html.unescape(m.group(1)))
        title = re.sub('<.*?>', '', html.unescape(m.group(2))).strip()
        snippet = re.sub('<.*?>', '', html.unescape(m.group(4) or '')).strip()
        out.append({'url': href, 'title': title, 'snippet': snippet})
        if len(out) >= max_results:
            break
    return out


def normalize_phone(val):
    if not val:
        return None
    digits = re.sub(r'\D', '', val)
    if digits.startswith('613') and len(digits) == 11:
        return f'+61 3 {digits[3:7]} {digits[7:11]}'
    if digits.startswith('03') and len(digits) == 10:
        return f'+61 3 {digits[2:6]} {digits[6:10]}'
    return None


def phones_in_text(text):
    cands = re.findall(r'(?<!\d)(?:\+61\s*3|0\s*3|\(03\))[\s\-\)]*\d{4}[\s\-]*\d{4}(?!\d)', text)
    out = []
    for c in cands:
        n = normalize_phone(c)
        if n and n not in out:
            out.append(n)
    return out


def parse_time(tok):
    tok = tok.strip().lower().replace('.', '')
    m = re.match(r'(\d{1,2})(?::(\d{2}))?\s*(am|pm)?', tok)
    if not m:
        return None
    h = int(m.group(1)); mins = int(m.group(2) or '00'); ap = m.group(3)
    if ap == 'am':
        if h == 12: h = 0
    elif ap == 'pm':
        if h != 12: h += 12
    return f'{h:02d}:{mins:02d}'


def group_hours(entries):
    buckets = defaultdict(list)
    for day, opens, closes in entries:
        if opens and closes:
            buckets[(opens, closes)].append(day)
    order = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
    result = []
    for (opens, closes), days in buckets.items():
        result.append({'days': sorted(days, key=order.index), 'opens': opens, 'closes': closes})
    result.sort(key=lambda x: order.index(x['days'][0]))
    return result


def parse_opening_hours_string(s):
    s = s.strip()
    parts = re.split(r'\s*,\s*', s)
    entries = []
    for part in parts:
        m = re.match(r'([A-Za-z]{2,9})(?:\s*[-–]\s*([A-Za-z]{2,9}))?\s+(\d{1,2}:?\d{0,2}\s*(?:am|pm)?)-?(\d{1,2}:?\d{0,2}\s*(?:am|pm)?)', part, re.I)
        if not m:
            continue
        start = DAY_MAP.get(m.group(1).lower())
        end = DAY_MAP.get((m.group(2) or m.group(1)).lower())
        if not start or not end:
            continue
        order = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
        si, ei = order.index(start), order.index(end)
        if si <= ei:
            days = order[si:ei+1]
        else:
            days = order[si:] + order[:ei+1]
        opens = parse_time(m.group(3)); closes = parse_time(m.group(4))
        for d in days:
            entries.append((d, opens, closes))
    return group_hours(entries)


def parse_opening_specs(obj):
    if isinstance(obj, dict):
        obj = [obj]
    entries = []
    for spec in obj or []:
        days = spec.get('dayOfWeek') or spec.get('dayofweek')
        opens = spec.get('opens'); closes = spec.get('closes')
        if not days or not opens or not closes:
            continue
        if not isinstance(days, list):
            days = [days]
        resolved = []
        for d in days:
            if isinstance(d, str):
                name = d.rsplit('/',1)[-1]
                name = DAY_MAP.get(name.lower(), name)
                if name in ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']:
                    resolved.append(name)
        for d in resolved:
            entries.append((d, opens[:5], closes[:5]))
    return group_hours(entries)


def address_tokens(addr):
    addr = (addr or '').lower()
    tokens = [t.strip(', ') for t in re.split(r'\s+', addr) if t.strip(', ')]
    keep = []
    for t in tokens:
        if t in {'vic','australia','au'}:
            continue
        keep.append(t)
    return keep


def name_tokens(name):
    return [t for t in re.findall(r'[a-z0-9]+', (name or '').lower()) if len(t) > 2 and t not in {'and','the','bar','cafe','hotel'}]


def name_match(text, name):
    text = (text or '').lower()
    toks = name_tokens(name)
    if not toks:
        return False
    hits = sum(1 for t in toks if t in text)
    return hits >= max(1, min(2, len(toks)))


def address_match(text, address):
    text = text.lower()
    toks = address_tokens(address)
    if not toks:
        return False
    checks = 0
    hits = 0
    for tok in toks:
        if len(tok) < 4 and not tok.isdigit():
            continue
        checks += 1
        if tok in text:
            hits += 1
    return hits >= max(2, min(4, checks)) if checks else False


def recursive_json_candidates(data):
    if isinstance(data, dict):
        yield data
        for v in data.values():
            yield from recursive_json_candidates(v)
    elif isinstance(data, list):
        for v in data:
            yield from recursive_json_candidates(v)


def extract_official_fields(url, raw):
    info = {'website': None, 'phone': None, 'openingHours': None, 'bookingRequired': False, 'bookingNotes': None, 'evidence': [], 'identityText': ''}
    scripts = re.findall(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', raw, re.S | re.I)
    for s in scripts:
        s = html.unescape(s).strip()
        if not s:
            continue
        try:
            data = json.loads(s)
        except Exception:
            try:
                data = json.loads(re.sub(r'\s+', ' ', s))
            except Exception:
                continue
        for obj in recursive_json_candidates(data):
            if obj.get('name') and isinstance(obj.get('name'), str):
                info['identityText'] += ' ' + obj.get('name')
            if not info['website']:
                u = obj.get('url') or obj.get('@id')
                if isinstance(u, str) and u.startswith('http'):
                    info['website'] = u.split('#')[0]
            if not info['phone']:
                p = obj.get('telephone') or obj.get('phone')
                n = normalize_phone(p if isinstance(p, str) else '')
                if n:
                    info['phone'] = n
            if not info['openingHours']:
                ohs = obj.get('openingHoursSpecification')
                parsed = parse_opening_specs(ohs)
                if parsed:
                    info['openingHours'] = parsed
                    info['evidence'].append('jsonld-spec')
            if not info['openingHours']:
                oh = obj.get('openingHours')
                if isinstance(oh, list):
                    for item in oh:
                        parsed = parse_opening_hours_string(item)
                        if parsed:
                            info['openingHours'] = parsed; info['evidence'].append('jsonld-hours-list'); break
                elif isinstance(oh, str):
                    parsed = parse_opening_hours_string(oh)
                    if parsed:
                        info['openingHours'] = parsed; info['evidence'].append('jsonld-hours-str')
    if not info['phone']:
        phones = phones_in_text(raw)
        if phones:
            info['phone'] = phones[0]
    m = re.search(r'<title[^>]*>(.*?)</title>', raw, re.I | re.S)
    if m:
        info['identityText'] += ' ' + re.sub('<.*?>', ' ', m.group(1))
    if not info['website'] and url.startswith('http'):
        info['website'] = url
    return info


def extract_fallback_fields(url, raw, venue):
    text = re.sub(r'<[^>]+>', ' ', raw)
    text = html.unescape(re.sub(r'\s+', ' ', text))
    if not name_match(text, venue['name']):
        return None
    if not address_match(text, venue['address']) and venue['place'].lower() not in text.lower():
        return None
    out = {'website': None, 'phone': None, 'openingHours': None, 'bookingRequired': False, 'bookingNotes': None}
    phones = phones_in_text(text)
    if phones:
        out['phone'] = phones[0]
    # website
    wm = re.search(r'Website\s*:?\s*(https?://[^\s<>"]+)', text, re.I)
    if wm:
        out['website'] = wm.group(1).rstrip(').,')
    else:
        links = re.findall(r'https?://[^\s"\']+', raw)
        for link in links:
            d = domain(link)
            if d and d not in FALLBACK_DOMAINS and 'google' not in d and 'facebook' not in d:
                out['website'] = link.rstrip(').,')
                break
    m = re.search(r'Monday:?\s*(Closed|\d{1,2}:\d{2}\s*[APMapm]{2}\s*-\s*\d{1,2}:\d{2}\s*[APMapm]{2}).*?Tuesday:?\s*(Closed|\d{1,2}:\d{2}\s*[APMapm]{2}\s*-\s*\d{1,2}:\d{2}\s*[APMapm]{2}).*?Wednesday:?\s*(Closed|\d{1,2}:\d{2}\s*[APMapm]{2}\s*-\s*\d{1,2}:\d{2}\s*[APMapm]{2}).*?Thursday:?\s*(Closed|\d{1,2}:\d{2}\s*[APMapm]{2}\s*-\s*\d{1,2}:\d{2}\s*[APMapm]{2}).*?Friday:?\s*(Closed|\d{1,2}:\d{2}\s*[APMapm]{2}\s*-\s*\d{1,2}:\d{2}\s*[APMapm]{2}).*?Saturday:?\s*(Closed|\d{1,2}:\d{2}\s*[APMapm]{2}\s*-\s*\d{1,2}:\d{2}\s*[APMapm]{2}).*?Sunday:?\s*(Closed|\d{1,2}:\d{2}\s*[APMapm]{2}\s*-\s*\d{1,2}:\d{2}\s*[APMapm]{2})', text, re.I)
    if m:
        order = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
        entries=[]
        for idx, day in enumerate(order, start=1):
            val = m.group(idx)
            if 'closed' in val.lower():
                continue
            mm = re.match(r'(\d{1,2}:\d{2}\s*[APMapm]{2})\s*-\s*(\d{1,2}:\d{2}\s*[APMapm]{2})', val, re.I)
            if mm:
                entries.append((day, parse_time(mm.group(1)), parse_time(mm.group(2))))
        out['openingHours'] = group_hours(entries)
    return out if any(out.values()) else None


def choose_official_search_result(results, name):
    lname = name.lower()
    tokens = [t for t in re.findall(r'[a-z0-9]+', lname) if len(t) > 2 and t not in {'and','the'}]
    for r in results:
        u = r['url']
        d = domain(u)
        if not d or d in BLOCKED_DOMAINS:
            continue
        text = (r['title'] + ' ' + r['snippet'] + ' ' + d).lower()
        score = sum(1 for t in tokens if t in text)
        if score >= max(1, min(2, len(tokens))):
            return u
    return None


def same_domain_paths(url):
    out = []
    if not url or not url.startswith('http'):
        return out
    p = urllib.parse.urlparse(url)
    root = f'{p.scheme}://{p.netloc}'
    for path in ['', '/', '/visit', '/contact', '/hours', '/opening-hours', '/bookings', '/booking', '/visit-us', '/cellar-door', '/restaurant', '/dine', '/eat-drink', '/spa']:
        out.append(root + path)
    return out


def linked_candidate_pages(base_url, raw):
    d = domain(base_url)
    found = []
    for href in re.findall(r'href=["\']([^"\']+)["\']', raw, re.I):
        href = html.unescape(href)
        full = urllib.parse.urljoin(base_url, href)
        if domain(full) != d:
            continue
        low = full.lower()
        if any(k in low for k in ['/visit', '/contact', '/hour', '/book', '/cellar', '/restaurant', '/dine', '/eat', '/spa']):
            if full not in found:
                found.append(full)
        if len(found) >= 8:
            break
    return found


def enrich_venue(slug):
    path = os.path.join(BASE, slug + '.json')
    data = json.load(open(path))
    vis = data.get('visiting') or {}
    missing_phone = not data.get('phone')
    missing_website = not data.get('website')
    missing_hours = not vis.get('openingHours')
    updates = {}
    evidence = {}
    local_text = ' '.join(str(data.get(k, '')) for k in ['signature', 'editorNote', 'whyWeGo', 'ifOnlyOneThing']).lower()
    if missing_hours and re.search(r'appointment\s*[- ]?only|by appointment|appointment essential|appointments essential', local_text):
        updates['openingHours'] = []
        updates['bookingRequired'] = True
        updates['bookingNotes'] = 'By appointment only — contact the venue directly.'
        evidence['openingHours'] = 'local-editorial-copy'
    candidates = []
    seed_urls = []
    if data.get('website'):
        seed_urls.append(data['website'])
    if data.get('bookingUrl') and isinstance(data['bookingUrl'], str) and data['bookingUrl'].startswith('http'):
        seed_urls.append(data['bookingUrl'])
    for u in seed_urls:
        for cu in same_domain_paths(u):
            if cu not in candidates:
                candidates.append(cu)
    results = []
    if missing_website or missing_phone or missing_hours:
        results = search(f'"{data["name"]}" "{data["place"]}"')
        official = choose_official_search_result(results, data['name'])
        if official:
            for cu in same_domain_paths(official):
                if cu not in candidates:
                    candidates.append(cu)
        # additional likely official result pages
        for r in results:
            d = domain(r['url'])
            if d and d not in BLOCKED_DOMAINS:
                if r['url'] not in candidates:
                    candidates.append(r['url'])
            if len(candidates) > 18:
                break
        # directory fallback results
        for r in results:
            d = domain(r['url'])
            if d in FALLBACK_DOMAINS:
                candidates.append(r['url'])
    seen = set()
    for url in candidates:
        if not url or url in seen:
            continue
        seen.add(url)
        try:
            final_url, raw = fetch(url)
        except Exception:
            continue
        d = domain(final_url)
        info = None
        if d not in BLOCKED_DOMAINS:
            info = extract_official_fields(final_url, raw)
            identity_ok = name_match(info.get('identityText','') + ' ' + raw[:5000], data['name'])
            if not identity_ok:
                continue
            if not address_match(raw.lower(), data['address']) and data['place'].lower() not in raw.lower() and d != domain(data.get('website','')):
                # likely generic brand/corporate page; distrust phone/hours
                info['phone'] = None
                info['openingHours'] = None
            for extra in linked_candidate_pages(final_url, raw):
                if extra not in seen and extra not in candidates:
                    candidates.append(extra)
        else:
            info = extract_fallback_fields(final_url, raw, data)
            if not info:
                continue
        if missing_website and not updates.get('website') and info.get('website'):
            if domain(info['website']) not in BLOCKED_DOMAINS:
                updates['website'] = info['website'].rstrip('/')
                evidence['website'] = final_url
        if missing_phone and not updates.get('phone') and info.get('phone'):
            updates['phone'] = info['phone']
            evidence['phone'] = final_url
        if missing_hours and not updates.get('openingHours') and info.get('openingHours'):
            updates['openingHours'] = info['openingHours']
            evidence['openingHours'] = final_url
        if (not missing_phone or updates.get('phone')) and (not missing_website or updates.get('website')) and (not missing_hours or updates.get('openingHours')):
            break
    changed = []
    if updates.get('phone') and missing_phone:
        data['phone'] = updates['phone']; changed.append('phone')
    if updates.get('website') and missing_website:
        data['website'] = updates['website']; changed.append('website')
    if 'openingHours' in updates and missing_hours:
        vis = data.get('visiting') or {}
        vis['openingHours'] = updates['openingHours']
        vis['bookingRequired'] = updates.get('bookingRequired', vis.get('bookingRequired', False))
        if updates.get('bookingNotes'):
            vis['bookingNotes'] = updates['bookingNotes']
        data['visiting'] = vis
        changed.append('openingHours')
    if changed:
        with open(path, 'w') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write('\n')
    return {'slug': slug, 'changed': changed, 'evidence': evidence}


def write_progress(done, results):
    changed = [r for r in results if r['changed']]
    lines = ['# Accuracy Pass Progress', '', f'Processed: {done}/{len(SLUGS)}', f'Updated venues: {len(changed)}', '']
    if changed:
        lines.append('## Recent updates')
        for r in changed[-20:]:
            lines.append(f"- {r['slug']}: {', '.join(r['changed'])}")
    with open(PROGRESS, 'w') as f:
        f.write('\n'.join(lines) + '\n')


def main():
    results=[]
    for idx, slug in enumerate(SLUGS, start=1):
        try:
            res = enrich_venue(slug)
        except Exception as e:
            res = {'slug': slug, 'changed': [], 'error': str(e)}
        results.append(res)
        if idx % 20 == 0 or idx == len(SLUGS):
            write_progress(idx, results)
        time.sleep(0.25)
    summary = {
        'processed': len(results),
        'updated': sum(1 for r in results if r['changed']),
        'field_updates': {k: sum(1 for r in results if k in r['changed']) for k in ['phone','website','openingHours']},
        'errors': [r for r in results if r.get('error')][:20]
    }
    print(json.dumps(summary, indent=2))

if __name__ == '__main__':
    main()

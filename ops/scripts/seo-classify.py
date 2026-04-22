"""
Peninsula Insider — SEO URL Classification
Classifies all 312 discovered-not-indexed URLs into four actionable buckets:

  KEEP_IMPROVE    Strong intent, improvable content — stay in sitemap, prioritise for GSC request
  KEEP_NOINDEX    Thin now but content-upgradeable — remove from sitemap until strengthened
  DIFFERENTIATE   Near-duplicate across sections — canonical or content-differentiate
  REMOVE          Utility pages, expired events — noindex + remove from sitemap

Run: py ops/scripts/seo-classify.py
Outputs:
  ops/reports/seo-classification.csv
  ops/reports/seo-classification-summary.md
"""
import os, json
from html.parser import HTMLParser
from collections import Counter, defaultdict
from datetime import date

BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TODAY = date.today().isoformat()

# Venues that appear in both eat/ and wine/ (all typed 'winery')
DUAL_LISTED_WINERIES = {
    "avani-wines","baillieu-vineyard","barmah-park-vineyard","circe-wines","crittenden-estate",
    "dexter-wines","dromana-estate","elan-vineyard","eldridge-estate","elgee-park","foxeys-hangout",
    "garagiste","hurley-vineyard","kerri-greens","kooyong","lightfoot-wines","main-ridge-estate",
    "merricks-estate","montalto","moorooduc-estate","morning-sun","nazaaray-estate","ocean-eight",
    "onannon","paradigm-hill","paringa-estate","phaedrus-estate","polperro","prancing-horse-estate",
    "quealy-winemakers","red-hill-estate","scorpo-wines","stonier-wines","stumpy-gully-vineyard",
    "t-gallant","trofeo-estate","tucks-ridge","willow-creek-vineyard","yabby-lake",
}

UTILITY_PATHS = {"privacy","terms","search","site-index","newsletter","about","contact","golf"}

URLS = [
    "https://peninsulainsider.com.au/about",
    "https://peninsulainsider.com.au/contact",
    "https://peninsulainsider.com.au/eat",
    "https://peninsulainsider.com.au/eat/afloat-mornington",
    "https://peninsulainsider.com.au/eat/allis-wine-bar",
    "https://peninsulainsider.com.au/eat/avani-wines",
    "https://peninsulainsider.com.au/eat/azuma-japanese",
    "https://peninsulainsider.com.au/eat/baillieu-vineyard",
    "https://peninsulainsider.com.au/eat/balnarring-bakehouse",
    "https://peninsulainsider.com.au/eat/balnarring-market",
    "https://peninsulainsider.com.au/eat/balnarring-pub",
    "https://peninsulainsider.com.au/eat/barmah-park",
    "https://peninsulainsider.com.au/eat/barmah-park-vineyard",
    "https://peninsulainsider.com.au/eat/barragunda-dining",
    "https://peninsulainsider.com.au/eat/best-restaurants",
    "https://peninsulainsider.com.au/eat/cedar-and-pine",
    "https://peninsulainsider.com.au/eat/ciao-amici",
    "https://peninsulainsider.com.au/eat/circe-wines",
    "https://peninsulainsider.com.au/eat/commonfolk-coffee",
    "https://peninsulainsider.com.au/eat/crittenden-estate",
    "https://peninsulainsider.com.au/eat/dexter-wines",
    "https://peninsulainsider.com.au/eat/doot-doot-doot",
    "https://peninsulainsider.com.au/eat/dromana-estate",
    "https://peninsulainsider.com.au/eat/dromana-hotel",
    "https://peninsulainsider.com.au/eat/eldridge-estate",
    "https://peninsulainsider.com.au/eat/elgee-park",
    "https://peninsulainsider.com.au/eat/epicurean-red-hill",
    "https://peninsulainsider.com.au/eat/flinders-general-store",
    "https://peninsulainsider.com.au/eat/flinders-pier-takeaway",
    "https://peninsulainsider.com.au/eat/flinders-sourdough",
    "https://peninsulainsider.com.au/eat/foxeys-hangout",
    "https://peninsulainsider.com.au/eat/garagiste",
    "https://peninsulainsider.com.au/eat/green-olive-red-hill",
    "https://peninsulainsider.com.au/eat/hurley-vineyard",
    "https://peninsulainsider.com.au/eat/johnny-ripe",
    "https://peninsulainsider.com.au/eat/kooyong",
    "https://peninsulainsider.com.au/eat/la-baracca-tgallant",
    "https://peninsulainsider.com.au/eat/laura-pt-leo",
    "https://peninsulainsider.com.au/eat/lightfoot-wines",
    "https://peninsulainsider.com.au/eat/main-ridge-estate",
    "https://peninsulainsider.com.au/eat/many-little",
    "https://peninsulainsider.com.au/eat/martha-s-table",
    "https://peninsulainsider.com.au/eat/maxs-red-hill-estate",
    "https://peninsulainsider.com.au/eat/merricks-estate",
    "https://peninsulainsider.com.au/eat/merricks-hotel",
    "https://peninsulainsider.com.au/eat/montalto",
    "https://peninsulainsider.com.au/eat/moorooduc-estate",
    "https://peninsulainsider.com.au/eat/morning-sun",
    "https://peninsulainsider.com.au/eat/mornington-dumpling-house",
    "https://peninsulainsider.com.au/eat/mornington-farmers-market",
    "https://peninsulainsider.com.au/eat/mornington-hotel",
    "https://peninsulainsider.com.au/eat/mr-vincenzos",
    "https://peninsulainsider.com.au/eat/nazaaray-estate",
    "https://peninsulainsider.com.au/eat/ocean-eight",
    "https://peninsulainsider.com.au/eat/onannon",
    "https://peninsulainsider.com.au/eat/ouest-france-bistro",
    "https://peninsulainsider.com.au/eat/pane-e-vino",
    "https://peninsulainsider.com.au/eat/paradigm-hill",
    "https://peninsulainsider.com.au/eat/paringa-estate",
    "https://peninsulainsider.com.au/eat/phaedrus-estate",
    "https://peninsulainsider.com.au/eat/pho-rosebud",
    "https://peninsulainsider.com.au/eat/pier-street-flinders",
    "https://peninsulainsider.com.au/eat/point-leo-wine-terrace",
    "https://peninsulainsider.com.au/eat/port-phillip-estate-restaurant",
    "https://peninsulainsider.com.au/eat/portsea-hotel",
    "https://peninsulainsider.com.au/eat/prancing-horse-estate",
    "https://peninsulainsider.com.au/eat/pt-leo-estate",
    "https://peninsulainsider.com.au/eat/quealy-winemakers",
    "https://peninsulainsider.com.au/eat/rare-hare",
    "https://peninsulainsider.com.au/eat/red-gum-bbq",
    "https://peninsulainsider.com.au/eat/red-hill-bakery",
    "https://peninsulainsider.com.au/eat/red-hill-estate",
    "https://peninsulainsider.com.au/eat/red-hill-market",
    "https://peninsulainsider.com.au/eat/rocker",
    "https://peninsulainsider.com.au/eat/rye-hotel",
    "https://peninsulainsider.com.au/eat/scorpo-wines",
    "https://peninsulainsider.com.au/eat/small-stone-pantry",
    "https://peninsulainsider.com.au/eat/somers-general",
    "https://peninsulainsider.com.au/eat/sorrento-bakery",
    "https://peninsulainsider.com.au/eat/sorrento-hotel",
    "https://peninsulainsider.com.au/eat/stillwater-crittenden",
    "https://peninsulainsider.com.au/eat/stonier-wines",
    "https://peninsulainsider.com.au/eat/store-ten",
    "https://peninsulainsider.com.au/eat/stringers-mornington",
    "https://peninsulainsider.com.au/eat/stumpy-gully-vineyard",
    "https://peninsulainsider.com.au/eat/t-gallant",
    "https://peninsulainsider.com.au/eat/tedesca-osteria",
    "https://peninsulainsider.com.au/eat/ten-minutes-by-tractor",
    "https://peninsulainsider.com.au/eat/thai-orchid-mornington",
    "https://peninsulainsider.com.au/eat/the-baths-sorrento",
    "https://peninsulainsider.com.au/eat/the-bay-hotel-mornington",
    "https://peninsulainsider.com.au/eat/the-rocks-mornington",
    "https://peninsulainsider.com.au/eat/trofeo-estate",
    "https://peninsulainsider.com.au/eat/tucks-ridge",
    "https://peninsulainsider.com.au/eat/via-boffe",
    "https://peninsulainsider.com.au/eat/willow-creek-vineyard",
    "https://peninsulainsider.com.au/eat/yabby-lake",
    "https://peninsulainsider.com.au/escape",
    "https://peninsulainsider.com.au/escape/flinders-and-cape-reset",
    "https://peninsulainsider.com.au/escape/ridge-to-sea-two-night-escape",
    "https://peninsulainsider.com.au/escape/sorrento-off-season-weekend",
    "https://peninsulainsider.com.au/escape/the-family-day-out",
    "https://peninsulainsider.com.au/escape/the-peninsula-golf-weekend",
    "https://peninsulainsider.com.au/escape/wellness-weekend",
    "https://peninsulainsider.com.au/explore",
    "https://peninsulainsider.com.au/explore/arthurs-seat-lookout",
    "https://peninsulainsider.com.au/explore/balnarring-beach",
    "https://peninsulainsider.com.au/explore/best-walks",
    "https://peninsulainsider.com.au/explore/bushrangers-bay",
    "https://peninsulainsider.com.au/explore/bushrangers-bay-walk",
    "https://peninsulainsider.com.au/explore/cape-schanck-boardwalk",
    "https://peninsulainsider.com.au/explore/cape-schanck-lighthouse-walk",
    "https://peninsulainsider.com.au/explore/coastal-walk-cape-schanck",
    "https://peninsulainsider.com.au/explore/coppins-track",
    "https://peninsulainsider.com.au/explore/dromana-beach",
    "https://peninsulainsider.com.au/explore/eagle-ridge-golf-course",
    "https://peninsulainsider.com.au/explore/farnsworth-track",
    "https://peninsulainsider.com.au/explore/flinders-golf-club",
    "https://peninsulainsider.com.au/explore/greens-bush-two-bays-section",
    "https://peninsulainsider.com.au/explore/gunnamatta-ocean-beach",
    "https://peninsulainsider.com.au/explore/montalto-sculpture-trail",
    "https://peninsulainsider.com.au/explore/moonah-links",
    "https://peninsulainsider.com.au/explore/mornington-foreshore-walk",
    "https://peninsulainsider.com.au/explore/mornington-golf-club",
    "https://peninsulainsider.com.au/explore/mornington-peninsula-gallery",
    "https://peninsulainsider.com.au/explore/mornington-peninsula-walk",
    "https://peninsulainsider.com.au/explore/mount-martha-beach",
    "https://peninsulainsider.com.au/explore/point-nepean-fort-walk",
    "https://peninsulainsider.com.au/explore/point-nepean-national-park",
    "https://peninsulainsider.com.au/explore/portsea-front-beach",
    "https://peninsulainsider.com.au/explore/portsea-golf-club",
    "https://peninsulainsider.com.au/explore/pt-leo-sculpture-park",
    "https://peninsulainsider.com.au/explore/racv-cape-schanck-golf-course",
    "https://peninsulainsider.com.au/explore/red-hill-hinterland-cycling",
    "https://peninsulainsider.com.au/explore/red-hill-market",
    "https://peninsulainsider.com.au/explore/rosebud-country-club",
    "https://peninsulainsider.com.au/explore/rye-ocean-beach",
    "https://peninsulainsider.com.au/explore/safety-beach-foreshore",
    "https://peninsulainsider.com.au/explore/sorrento-back-beach",
    "https://peninsulainsider.com.au/explore/sorrento-ferry",
    "https://peninsulainsider.com.au/explore/sorrento-golf-club",
    "https://peninsulainsider.com.au/explore/sorrento-ocean-baths",
    "https://peninsulainsider.com.au/explore/st-andrews-beach-golf-course",
    "https://peninsulainsider.com.au/explore/summit-circuit-arthurs-seat",
    "https://peninsulainsider.com.au/explore/the-dunes-golf-links",
    "https://peninsulainsider.com.au/explore/the-national-golf-club",
    "https://peninsulainsider.com.au/explore/two-bays-walking-track",
    "https://peninsulainsider.com.au/golf",
    "https://peninsulainsider.com.au/journal",
    "https://peninsulainsider.com.au/journal/a-flinders-weekend",
    "https://peninsulainsider.com.au/journal/a-winter-peninsula-weekend",
    "https://peninsulainsider.com.au/journal/autumn-weekend-edit",
    "https://peninsulainsider.com.au/journal/best-brunch-mornington-peninsula",
    "https://peninsulainsider.com.au/journal/best-golf-courses-mornington-peninsula",
    "https://peninsulainsider.com.au/journal/best-spas-mornington-peninsula",
    "https://peninsulainsider.com.au/journal/breakfast-before-the-crowds",
    "https://peninsulainsider.com.au/journal/first-time-peninsula",
    "https://peninsulainsider.com.au/journal/how-to-build-a-red-hill-saturday",
    "https://peninsulainsider.com.au/journal/how-to-plan-a-peninsula-weekend",
    "https://peninsulainsider.com.au/journal/mornington-day-guide",
    "https://peninsulainsider.com.au/journal/mornington-peninsula-day-trip",
    "https://peninsulainsider.com.au/journal/mornington-peninsula-golf-guide",
    "https://peninsulainsider.com.au/journal/mornington-peninsula-golf-stay-and-play",
    "https://peninsulainsider.com.au/journal/mornington-peninsula-hot-springs-guide",
    "https://peninsulainsider.com.au/journal/mornington-peninsula-in-autumn",
    "https://peninsulainsider.com.au/journal/mornington-peninsula-in-winter",
    "https://peninsulainsider.com.au/journal/mornington-peninsula-itinerary",
    "https://peninsulainsider.com.au/journal/mornington-peninsula-stay-and-soak",
    "https://peninsulainsider.com.au/journal/mornington-peninsula-wedding-venues",
    "https://peninsulainsider.com.au/journal/mornington-peninsula-winery-tour",
    "https://peninsulainsider.com.au/journal/mornington-peninsula-with-kids",
    "https://peninsulainsider.com.au/journal/peninsula-hot-springs-vs-alba",
    "https://peninsulainsider.com.au/journal/peninsula-this-weekend-april-18",
    "https://peninsulainsider.com.au/journal/rainy-day-peninsula",
    "https://peninsulainsider.com.au/journal/the-birthday-weekend",
    "https://peninsulainsider.com.au/journal/the-cellar-door-short-list",
    "https://peninsulainsider.com.au/journal/the-chardonnay-case",
    "https://peninsulainsider.com.au/journal/the-couples-weekend",
    "https://peninsulainsider.com.au/journal/the-dog-friendly-peninsula",
    "https://peninsulainsider.com.au/journal/the-easter-peninsula",
    "https://peninsulainsider.com.au/journal/the-four-hour-peninsula",
    "https://peninsulainsider.com.au/journal/the-market-saturday",
    "https://peninsulainsider.com.au/journal/the-one-night-escape",
    "https://peninsulainsider.com.au/journal/the-peninsula-beach-swimming-guide",
    "https://peninsulainsider.com.au/journal/the-peninsula-orientation-drive",
    "https://peninsulainsider.com.au/journal/the-peninsula-pantry",
    "https://peninsulainsider.com.au/journal/the-peninsula-picnic",
    "https://peninsulainsider.com.au/journal/the-peninsula-with-kids",
    "https://peninsulainsider.com.au/journal/the-peninsulas-best-late-afternoon-walks",
    "https://peninsulainsider.com.au/journal/the-point-nepean-half-day",
    "https://peninsulainsider.com.au/journal/the-producer-trail",
    "https://peninsulainsider.com.au/journal/the-pub-crawl",
    "https://peninsulainsider.com.au/journal/the-rainy-day-peninsula-without-a-booking",
    "https://peninsulainsider.com.au/journal/the-school-holidays-survival-guide",
    "https://peninsulainsider.com.au/journal/the-seafood-list",
    "https://peninsulainsider.com.au/journal/the-sorrento-weekend",
    "https://peninsulainsider.com.au/journal/the-spring-peninsula",
    "https://peninsulainsider.com.au/journal/the-sunset-drink",
    "https://peninsulainsider.com.au/journal/the-sunset-hour",
    "https://peninsulainsider.com.au/journal/the-vineyard-villa-weekend",
    "https://peninsulainsider.com.au/journal/where-to-eat-without-a-booking",
    "https://peninsulainsider.com.au/journal/where-to-stay-for-a-two-night-escape",
    "https://peninsulainsider.com.au/newsletter",
    "https://peninsulainsider.com.au/places",
    "https://peninsulainsider.com.au/places/balnarring",
    "https://peninsulainsider.com.au/places/blairgowrie",
    "https://peninsulainsider.com.au/places/cape-schanck",
    "https://peninsulainsider.com.au/places/dromana",
    "https://peninsulainsider.com.au/places/flinders",
    "https://peninsulainsider.com.au/places/hastings",
    "https://peninsulainsider.com.au/places/main-ridge",
    "https://peninsulainsider.com.au/places/merricks",
    "https://peninsulainsider.com.au/places/moorooduc",
    "https://peninsulainsider.com.au/places/mornington",
    "https://peninsulainsider.com.au/places/mount-martha",
    "https://peninsulainsider.com.au/places/point-nepean",
    "https://peninsulainsider.com.au/places/portsea",
    "https://peninsulainsider.com.au/places/rosebud",
    "https://peninsulainsider.com.au/places/rye",
    "https://peninsulainsider.com.au/places/safety-beach",
    "https://peninsulainsider.com.au/places/shoreham",
    "https://peninsulainsider.com.au/places/sorrento",
    "https://peninsulainsider.com.au/places/tuerong",
    "https://peninsulainsider.com.au/privacy",
    "https://peninsulainsider.com.au/search",
    "https://peninsulainsider.com.au/site-index",
    "https://peninsulainsider.com.au/spa",
    "https://peninsulainsider.com.au/stay",
    "https://peninsulainsider.com.au/stay/alba-thermal-springs",
    "https://peninsulainsider.com.au/stay/endota-spa-mornington",
    "https://peninsulainsider.com.au/stay/flinders-hotel",
    "https://peninsulainsider.com.au/stay/hillview-cottages",
    "https://peninsulainsider.com.au/stay/hotel-sorrento",
    "https://peninsulainsider.com.au/stay/jackalope",
    "https://peninsulainsider.com.au/stay/lindenderry",
    "https://peninsulainsider.com.au/stay/one-spa-racv-cape-schanck",
    "https://peninsulainsider.com.au/stay/peninsula-hot-springs",
    "https://peninsulainsider.com.au/stay/peninsula-hot-springs-glamping",
    "https://peninsulainsider.com.au/stay/point-leo-estate-villas",
    "https://peninsulainsider.com.au/stay/polperro-villas",
    "https://peninsulainsider.com.au/stay/port-phillip-estate",
    "https://peninsulainsider.com.au/stay/spa-by-jackalope",
    "https://peninsulainsider.com.au/stay/the-continental-sorrento",
    "https://peninsulainsider.com.au/terms",
    "https://peninsulainsider.com.au/whats-on",
    "https://peninsulainsider.com.au/whats-on/alba-fire-and-ice-sessions",
    "https://peninsulainsider.com.au/whats-on/anzac-day-sorrento-dawn",
    "https://peninsulainsider.com.au/whats-on/briars-eco-explorers-autumn",
    "https://peninsulainsider.com.au/whats-on/chocolaterie-junior-chocolatier",
    "https://peninsulainsider.com.au/whats-on/moonlit-sanctuary-easter-program",
    "https://peninsulainsider.com.au/whats-on/mprg-autumn-exhibition",
    "https://peninsulainsider.com.au/whats-on/peninsula-hot-springs-sunday-sessions",
    "https://peninsulainsider.com.au/whats-on/red-hill-market-first-saturday",
    "https://peninsulainsider.com.au/whats-on/sorrento-writers-festival-2026",
    "https://peninsulainsider.com.au/whats-on/sunny-ridge-strawberry-picking",
    "https://peninsulainsider.com.au/whats-on/winter-wine-weekend-june",
    "https://peninsulainsider.com.au/wine",
    "https://peninsulainsider.com.au/wine/advance-mussel-supply",
    "https://peninsulainsider.com.au/wine/ashcombe-maze",
    "https://peninsulainsider.com.au/wine/avani-wines",
    "https://peninsulainsider.com.au/wine/baillieu-vineyard",
    "https://peninsulainsider.com.au/wine/barmah-park-vineyard",
    "https://peninsulainsider.com.au/wine/bass-and-flinders",
    "https://peninsulainsider.com.au/wine/best-cellar-doors",
    "https://peninsulainsider.com.au/wine/circe-wines",
    "https://peninsulainsider.com.au/wine/crittenden-estate",
    "https://peninsulainsider.com.au/wine/dexter-wines",
    "https://peninsulainsider.com.au/wine/dromana-estate",
    "https://peninsulainsider.com.au/wine/elan-vineyard",
    "https://peninsulainsider.com.au/wine/eldridge-estate",
    "https://peninsulainsider.com.au/wine/elgee-park",
    "https://peninsulainsider.com.au/wine/foxeys-hangout",
    "https://peninsulainsider.com.au/wine/garagiste",
    "https://peninsulainsider.com.au/wine/hastings-fishermens-coop",
    "https://peninsulainsider.com.au/wine/hurley-vineyard",
    "https://peninsulainsider.com.au/wine/jetty-road-brewery",
    "https://peninsulainsider.com.au/wine/kerri-greens",
    "https://peninsulainsider.com.au/wine/kooyong",
    "https://peninsulainsider.com.au/wine/lightfoot-wines",
    "https://peninsulainsider.com.au/wine/main-ridge-dairy",
    "https://peninsulainsider.com.au/wine/main-ridge-estate",
    "https://peninsulainsider.com.au/wine/merricks-estate",
    "https://peninsulainsider.com.au/wine/montalto",
    "https://peninsulainsider.com.au/wine/moorooduc-estate",
    "https://peninsulainsider.com.au/wine/morning-sun",
    "https://peninsulainsider.com.au/wine/mornington-peninsula-brewery",
    "https://peninsulainsider.com.au/wine/mornington-peninsula-chocolates",
    "https://peninsulainsider.com.au/wine/nazaaray-estate",
    "https://peninsulainsider.com.au/wine/ocean-eight",
    "https://peninsulainsider.com.au/wine/onannon",
    "https://peninsulainsider.com.au/wine/paradigm-hill",
    "https://peninsulainsider.com.au/wine/paringa-estate",
    "https://peninsulainsider.com.au/wine/peninsula-fresh-organics",
    "https://peninsulainsider.com.au/wine/phaedrus-estate",
    "https://peninsulainsider.com.au/wine/pier-street-seafood",
    "https://peninsulainsider.com.au/wine/polperro",
    "https://peninsulainsider.com.au/wine/prancing-horse-estate",
    "https://peninsulainsider.com.au/wine/quealy-winemakers",
    "https://peninsulainsider.com.au/wine/red-hill-brewery",
    "https://peninsulainsider.com.au/wine/red-hill-estate",
    "https://peninsulainsider.com.au/wine/red-hill-truffles",
    "https://peninsulainsider.com.au/wine/scorpo-wines",
    "https://peninsulainsider.com.au/wine/st-andrews-beach-brewery",
    "https://peninsulainsider.com.au/wine/stonier-wines",
    "https://peninsulainsider.com.au/wine/stumpy-gully-vineyard",
    "https://peninsulainsider.com.au/wine/sunny-ridge-strawberry-farm",
    "https://peninsulainsider.com.au/wine/t-gallant",
    "https://peninsulainsider.com.au/wine/trofeo-estate",
    "https://peninsulainsider.com.au/wine/tucks-ridge",
    "https://peninsulainsider.com.au/wine/two-bays-brewing",
    "https://peninsulainsider.com.au/wine/willow-creek-vineyard",
    "https://peninsulainsider.com.au/wine/yabby-lake",
]


class PageAnalyser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.body_words = 0
        self.title = ""
        self.meta_desc = ""
        self.h1s = []
        self._in_skip = 0
        self._in_title = False
        self._in_h1 = False
        self._cur_h1 = []
        self._skip_tags = {"script", "style", "nav", "header", "footer", "noscript"}

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag in self._skip_tags:
            self._in_skip += 1
        if tag == "title":
            self._in_title = True
        if tag == "h1":
            self._in_h1 = True
            self._cur_h1 = []
        if tag == "meta" and d.get("name", "").lower() == "description":
            self.meta_desc = d.get("content", "")

    def handle_endtag(self, tag):
        if tag in self._skip_tags and self._in_skip > 0:
            self._in_skip -= 1
        if tag == "title":
            self._in_title = False
        if tag == "h1":
            self._in_h1 = False
            self.h1s.append(" ".join(self._cur_h1))

    def handle_data(self, data):
        t = data.strip()
        if not t:
            return
        if self._in_title:
            self.title += t
        if self._in_h1:
            self._cur_h1.append(t)
        if self._in_skip == 0:
            self.body_words += len(t.split())


def analyse(path):
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            html = f.read()
        p = PageAnalyser()
        p.feed(html)
        return {"words": p.body_words, "title": p.title.strip(),
                "meta_desc": p.meta_desc.strip(), "h1": p.h1s[0] if p.h1s else ""}
    except Exception as e:
        return {"words": 0, "title": "", "meta_desc": "", "h1": "", "error": str(e)}


def classify(path_part, words, section, slug):
    # 1. Utility — always remove
    if path_part in UTILITY_PATHS:
        return "REMOVE", "utility page — noindex + remove from sitemap"

    # 2. Events (whats-on) — remove from sitemap; keep accessible
    if section == "whats-on":
        return "REMOVE", "time-limited event page — noindex + remove from sitemap"

    # 3. eat/ pages for winery venues — near-duplicate of wine/ canonical
    if section == "eat" and slug in DUAL_LISTED_WINERIES:
        return "DIFFERENTIATE", "near-duplicate of wine/{slug} — differentiate dining vs cellar door content, or add canonical to wine/"

    # 4. Strong content already
    if section in ("journal", "explore", "places", "escape") and words >= 800:
        return "KEEP_IMPROVE", "strong content — keep in sitemap, request indexing"

    # 5. Hub pages — always keep
    if slug == "" or (path_part in ("eat","wine","stay","explore","journal","places","escape","spa","weddings","walks","corporate-events")):
        return "KEEP_IMPROVE", "section hub — strong internal link anchor, keep in sitemap"

    # 6. 'Best of' aggregator pages — high search value
    if slug in ("best-restaurants","best-cellar-doors","best-walks","best-accommodation"):
        return "KEEP_IMPROVE", "best-of hub — high search intent, prioritise for improvement"

    # 7. Good word count
    if words >= 800:
        return "KEEP_IMPROVE", f"{words}w — keep in sitemap"

    # 8. Borderline — needs improvement
    if words >= 450:
        return "KEEP_NOINDEX", f"{words}w — remove from sitemap until content expanded to 800+ words"

    # 9. Thin
    return "KEEP_NOINDEX", f"{words}w — thin, noindex + remove from sitemap until rebuilt"


results = []
for url in URLS:
    path_part = url.replace("https://peninsulainsider.com.au/", "")
    section = path_part.split("/")[0] if "/" in path_part else path_part or "homepage"
    slug = path_part.split("/")[-1] if "/" in path_part else path_part
    file_path = os.path.join(BASE, path_part, "index.html") if path_part else os.path.join(BASE, "index.html")
    data = analyse(file_path)
    bucket, reason = classify(path_part, data["words"], section, slug)
    results.append({
        "url": url, "path": path_part, "section": section, "slug": slug,
        "words": data["words"], "title": data["title"], "meta_desc": data["meta_desc"],
        "bucket": bucket, "reason": reason,
    })

# Ensure output dir exists
os.makedirs(os.path.join(BASE, "ops/reports"), exist_ok=True)

# Write CSV
csv_path = os.path.join(BASE, "ops/reports/seo-classification.csv")
with open(csv_path, "w", encoding="utf-8") as f:
    f.write("bucket,section,words,url,reason,title\n")
    for r in sorted(results, key=lambda x: (x["bucket"], x["section"], x["words"])):
        title = r["title"].replace('"', "'")
        reason = r["reason"].replace('"', "'")
        f.write(f'{r["bucket"]},{r["section"]},{r["words"]},"{r["url"]}","{reason}","{title}"\n')

# Write markdown summary
md_path = os.path.join(BASE, "ops/reports/seo-classification-summary.md")
counts = Counter(r["bucket"] for r in results)
by_section = defaultdict(Counter)
for r in results:
    by_section[r["section"]][r["bucket"]] += 1

with open(md_path, "w", encoding="utf-8") as f:
    f.write(f"# Peninsula Insider — SEO URL Classification\n\n")
    f.write(f"_Generated {TODAY} from {len(results)} discovered-not-indexed URLs_\n\n")
    f.write("## Summary\n\n")
    f.write("| Bucket | Count | Action |\n|---|---|---|\n")
    actions = {
        "KEEP_IMPROVE": "Keep in sitemap. Strengthen content. Request indexing for best pages.",
        "KEEP_NOINDEX": "Remove from sitemap. Keep page accessible. Expand content before re-adding.",
        "DIFFERENTIATE": "Near-duplicate across sections. Add canonical or differentiate eat vs wine content.",
        "REMOVE": "Add noindex meta. Remove from sitemap generator.",
    }
    for bucket in ("KEEP_IMPROVE","KEEP_NOINDEX","DIFFERENTIATE","REMOVE"):
        f.write(f"| **{bucket}** | {counts[bucket]} | {actions[bucket]} |\n")
    f.write("\n")

    f.write("## By Section\n\n")
    f.write("| Section | Total | KEEP_IMPROVE | KEEP_NOINDEX | DIFFERENTIATE | REMOVE |\n|---|---|---|---|---|---|\n")
    for sec in sorted(by_section):
        c = by_section[sec]
        total = sum(c.values())
        f.write(f"| {sec} | {total} | {c.get('KEEP_IMPROVE',0)} | {c.get('KEEP_NOINDEX',0)} | {c.get('DIFFERENTIATE',0)} | {c.get('REMOVE',0)} |\n")
    f.write("\n")

    for bucket in ("KEEP_IMPROVE","KEEP_NOINDEX","DIFFERENTIATE","REMOVE"):
        f.write(f"## {bucket}\n\n")
        bucket_items = [r for r in results if r["bucket"] == bucket]
        bucket_items.sort(key=lambda x: (-x["words"], x["section"]))
        f.write("| URL | Words | Reason |\n|---|---|---|\n")
        for r in bucket_items:
            f.write(f"| {r['url']} | {r['words']} | {r['reason']} |\n")
        f.write("\n")

print("=== CLASSIFICATION SUMMARY ===")
for bucket in ("KEEP_IMPROVE","KEEP_NOINDEX","DIFFERENTIATE","REMOVE"):
    print(f"  {bucket}: {counts[bucket]}")
print()
print("=== BY SECTION ===")
for sec in sorted(by_section):
    c = by_section[sec]
    total = sum(c.values())
    parts = "  ".join(f"{k.replace('_',' ')}:{v}" for k, v in sorted(c.items()))
    print(f"  {sec:30s} ({total:3d})  {parts}")
print()
print("CSV  -> ops/reports/seo-classification.csv")
print("MD   -> ops/reports/seo-classification-summary.md")

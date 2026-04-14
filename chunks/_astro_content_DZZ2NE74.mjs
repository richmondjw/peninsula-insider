import { Traverse } from 'neotraverse/modern';
import pLimit from 'p-limit';
import { removeBase, prependForwardSlash } from '@astrojs/internal-helpers/path';
import { i as isCoreRemotePath, V as VALID_INPUT_FORMATS } from './astro/assets-service_lzFWa4op.mjs';
import { A as AstroError, U as UnknownContentCollectionError, c as createComponent, g as renderUniqueStylesheet, h as renderScriptElement, i as createHeadAndContent, r as renderComponent, a as renderTemplate, u as unescapeHTML } from './astro/server_KY4LC4M3.mjs';
import 'kleur/colors';
import * as devalue from 'devalue';

const CONTENT_IMAGE_FLAG = "astroContentImageFlag";
const IMAGE_IMPORT_PREFIX = "__ASTRO_IMAGE_";

function imageSrcToImportId(imageSrc, filePath) {
  imageSrc = removeBase(imageSrc, IMAGE_IMPORT_PREFIX);
  if (isCoreRemotePath(imageSrc)) {
    return;
  }
  const ext = imageSrc.split(".").at(-1);
  if (!ext || !VALID_INPUT_FORMATS.includes(ext)) {
    return;
  }
  const params = new URLSearchParams(CONTENT_IMAGE_FLAG);
  if (filePath) {
    params.set("importer", filePath);
  }
  return `${imageSrc}?${params.toString()}`;
}

class DataStore {
  _collections = /* @__PURE__ */ new Map();
  constructor() {
    this._collections = /* @__PURE__ */ new Map();
  }
  get(collectionName, key) {
    return this._collections.get(collectionName)?.get(String(key));
  }
  entries(collectionName) {
    const collection = this._collections.get(collectionName) ?? /* @__PURE__ */ new Map();
    return [...collection.entries()];
  }
  values(collectionName) {
    const collection = this._collections.get(collectionName) ?? /* @__PURE__ */ new Map();
    return [...collection.values()];
  }
  keys(collectionName) {
    const collection = this._collections.get(collectionName) ?? /* @__PURE__ */ new Map();
    return [...collection.keys()];
  }
  has(collectionName, key) {
    const collection = this._collections.get(collectionName);
    if (collection) {
      return collection.has(String(key));
    }
    return false;
  }
  hasCollection(collectionName) {
    return this._collections.has(collectionName);
  }
  collections() {
    return this._collections;
  }
  /**
   * Attempts to load a DataStore from the virtual module.
   * This only works in Vite.
   */
  static async fromModule() {
    try {
      const data = await import('./_astro_data-layer-content_BcEe_9wP.mjs');
      if (data.default instanceof Map) {
        return DataStore.fromMap(data.default);
      }
      const map = devalue.unflatten(data.default);
      return DataStore.fromMap(map);
    } catch {
    }
    return new DataStore();
  }
  static async fromMap(data) {
    const store = new DataStore();
    store._collections = data;
    return store;
  }
}
function dataStoreSingleton() {
  let instance = void 0;
  return {
    get: async () => {
      if (!instance) {
        instance = DataStore.fromModule();
      }
      return instance;
    },
    set: (store) => {
      instance = store;
    }
  };
}
const globalDataStore = dataStoreSingleton();

const __vite_import_meta_env__ = {"ASSETS_PREFIX": undefined, "BASE_URL": "/", "DEV": false, "MODE": "production", "PROD": true, "SITE": "https://peninsulainsider.com.au", "SSR": true};
function createCollectionToGlobResultMap({
  globResult,
  contentDir
}) {
  const collectionToGlobResultMap = {};
  for (const key in globResult) {
    const keyRelativeToContentDir = key.replace(new RegExp(`^${contentDir}`), "");
    const segments = keyRelativeToContentDir.split("/");
    if (segments.length <= 1) continue;
    const collection = segments[0];
    collectionToGlobResultMap[collection] ??= {};
    collectionToGlobResultMap[collection][key] = globResult[key];
  }
  return collectionToGlobResultMap;
}
function createGetCollection({
  contentCollectionToEntryMap,
  dataCollectionToEntryMap,
  getRenderEntryImport,
  cacheEntriesByCollection
}) {
  return async function getCollection(collection, filter) {
    const hasFilter = typeof filter === "function";
    const store = await globalDataStore.get();
    let type;
    if (collection in contentCollectionToEntryMap) {
      type = "content";
    } else if (collection in dataCollectionToEntryMap) {
      type = "data";
    } else if (store.hasCollection(collection)) {
      const { default: imageAssetMap } = await import('./_astro_asset-imports_D9aVaOQr.mjs');
      const result = [];
      for (const rawEntry of store.values(collection)) {
        const data = updateImageReferencesInData(rawEntry.data, rawEntry.filePath, imageAssetMap);
        const entry = {
          ...rawEntry,
          data,
          collection
        };
        if (hasFilter && !filter(entry)) {
          continue;
        }
        result.push(entry);
      }
      return result;
    } else {
      console.warn(
        `The collection ${JSON.stringify(
          collection
        )} does not exist or is empty. Ensure a collection directory with this name exists.`
      );
      return [];
    }
    const lazyImports = Object.values(
      type === "content" ? contentCollectionToEntryMap[collection] : dataCollectionToEntryMap[collection]
    );
    let entries = [];
    if (!Object.assign(__vite_import_meta_env__, {})?.DEV && cacheEntriesByCollection.has(collection)) {
      entries = cacheEntriesByCollection.get(collection);
    } else {
      const limit = pLimit(10);
      entries = await Promise.all(
        lazyImports.map(
          (lazyImport) => limit(async () => {
            const entry = await lazyImport();
            return type === "content" ? {
              id: entry.id,
              slug: entry.slug,
              body: entry.body,
              collection: entry.collection,
              data: entry.data,
              async render() {
                return render({
                  collection: entry.collection,
                  id: entry.id,
                  renderEntryImport: await getRenderEntryImport(collection, entry.slug)
                });
              }
            } : {
              id: entry.id,
              collection: entry.collection,
              data: entry.data
            };
          })
        )
      );
      cacheEntriesByCollection.set(collection, entries);
    }
    if (hasFilter) {
      return entries.filter(filter);
    } else {
      return entries.slice();
    }
  };
}
function createGetEntry({
  getEntryImport,
  getRenderEntryImport,
  collectionNames
}) {
  return async function getEntry(collectionOrLookupObject, _lookupId) {
    let collection, lookupId;
    if (typeof collectionOrLookupObject === "string") {
      collection = collectionOrLookupObject;
      if (!_lookupId)
        throw new AstroError({
          ...UnknownContentCollectionError,
          message: "`getEntry()` requires an entry identifier as the second argument."
        });
      lookupId = _lookupId;
    } else {
      collection = collectionOrLookupObject.collection;
      lookupId = "id" in collectionOrLookupObject ? collectionOrLookupObject.id : collectionOrLookupObject.slug;
    }
    const store = await globalDataStore.get();
    if (store.hasCollection(collection)) {
      const entry2 = store.get(collection, lookupId);
      if (!entry2) {
        console.warn(`Entry ${collection} → ${lookupId} was not found.`);
        return;
      }
      const { default: imageAssetMap } = await import('./_astro_asset-imports_D9aVaOQr.mjs');
      entry2.data = updateImageReferencesInData(entry2.data, entry2.filePath, imageAssetMap);
      return {
        ...entry2,
        collection
      };
    }
    if (!collectionNames.has(collection)) {
      console.warn(`The collection ${JSON.stringify(collection)} does not exist.`);
      return void 0;
    }
    const entryImport = await getEntryImport(collection, lookupId);
    if (typeof entryImport !== "function") return void 0;
    const entry = await entryImport();
    if (entry._internal.type === "content") {
      return {
        id: entry.id,
        slug: entry.slug,
        body: entry.body,
        collection: entry.collection,
        data: entry.data,
        async render() {
          return render({
            collection: entry.collection,
            id: entry.id,
            renderEntryImport: await getRenderEntryImport(collection, lookupId)
          });
        }
      };
    } else if (entry._internal.type === "data") {
      return {
        id: entry.id,
        collection: entry.collection,
        data: entry.data
      };
    }
    return void 0;
  };
}
function updateImageReferencesInData(data, fileName, imageAssetMap) {
  return new Traverse(data).map(function(ctx, val) {
    if (typeof val === "string" && val.startsWith(IMAGE_IMPORT_PREFIX)) {
      const src = val.replace(IMAGE_IMPORT_PREFIX, "");
      const id = imageSrcToImportId(src, fileName);
      if (!id) {
        ctx.update(src);
        return;
      }
      const imported = imageAssetMap?.get(id);
      if (imported) {
        ctx.update(imported);
      } else {
        ctx.update(src);
      }
    }
  });
}
async function render({
  collection,
  id,
  renderEntryImport
}) {
  const UnexpectedRenderError = new AstroError({
    ...UnknownContentCollectionError,
    message: `Unexpected error while rendering ${String(collection)} → ${String(id)}.`
  });
  if (typeof renderEntryImport !== "function") throw UnexpectedRenderError;
  const baseMod = await renderEntryImport();
  if (baseMod == null || typeof baseMod !== "object") throw UnexpectedRenderError;
  const { default: defaultMod } = baseMod;
  if (isPropagatedAssetsModule(defaultMod)) {
    const { collectedStyles, collectedLinks, collectedScripts, getMod } = defaultMod;
    if (typeof getMod !== "function") throw UnexpectedRenderError;
    const propagationMod = await getMod();
    if (propagationMod == null || typeof propagationMod !== "object") throw UnexpectedRenderError;
    const Content = createComponent({
      factory(result, baseProps, slots) {
        let styles = "", links = "", scripts = "";
        if (Array.isArray(collectedStyles)) {
          styles = collectedStyles.map((style) => {
            return renderUniqueStylesheet(result, {
              type: "inline",
              content: style
            });
          }).join("");
        }
        if (Array.isArray(collectedLinks)) {
          links = collectedLinks.map((link) => {
            return renderUniqueStylesheet(result, {
              type: "external",
              src: prependForwardSlash(link)
            });
          }).join("");
        }
        if (Array.isArray(collectedScripts)) {
          scripts = collectedScripts.map((script) => renderScriptElement(script)).join("");
        }
        let props = baseProps;
        if (id.endsWith("mdx")) {
          props = {
            components: propagationMod.components ?? {},
            ...baseProps
          };
        }
        return createHeadAndContent(
          unescapeHTML(styles + links + scripts),
          renderTemplate`${renderComponent(
            result,
            "Content",
            propagationMod.Content,
            props,
            slots
          )}`
        );
      },
      propagation: "self"
    });
    return {
      Content,
      headings: propagationMod.getHeadings?.() ?? [],
      remarkPluginFrontmatter: propagationMod.frontmatter ?? {}
    };
  } else if (baseMod.Content && typeof baseMod.Content === "function") {
    return {
      Content: baseMod.Content,
      headings: baseMod.getHeadings?.() ?? [],
      remarkPluginFrontmatter: baseMod.frontmatter ?? {}
    };
  } else {
    throw UnexpectedRenderError;
  }
}
function isPropagatedAssetsModule(module) {
  return typeof module === "object" && module != null && "__astroPropagation" in module;
}

// astro-head-inject

const contentDir = '/src/content/';

const contentEntryGlob = /* #__PURE__ */ Object.assign({"/src/content/articles/a-flinders-weekend.md": () => import('./a-flinders-weekend_BWSQICEZ.mjs'),"/src/content/articles/a-winter-peninsula-weekend.md": () => import('./a-winter-peninsula-weekend_D614PebI.mjs'),"/src/content/articles/autumn-weekend-edit.md": () => import('./autumn-weekend-edit_CS8X2Mja.mjs'),"/src/content/articles/best-golf-courses-mornington-peninsula.md": () => import('./best-golf-courses-mornington-peninsula_hGBPI1oA.mjs'),"/src/content/articles/best-spas-mornington-peninsula.md": () => import('./best-spas-mornington-peninsula_DOGTSanA.mjs'),"/src/content/articles/breakfast-before-the-crowds.md": () => import('./breakfast-before-the-crowds_C7pZa4GQ.mjs'),"/src/content/articles/first-time-peninsula.md": () => import('./first-time-peninsula_ISwPxoZ3.mjs'),"/src/content/articles/how-to-build-a-red-hill-saturday.md": () => import('./how-to-build-a-red-hill-saturday_CFJBVjoW.mjs'),"/src/content/articles/how-to-plan-a-peninsula-weekend.md": () => import('./how-to-plan-a-peninsula-weekend_BOzT2BPG.mjs'),"/src/content/articles/mornington-day-guide.md": () => import('./mornington-day-guide_C1oskppO.mjs'),"/src/content/articles/mornington-peninsula-golf-guide.md": () => import('./mornington-peninsula-golf-guide_52Mb9_BU.mjs'),"/src/content/articles/mornington-peninsula-golf-stay-and-play.md": () => import('./mornington-peninsula-golf-stay-and-play_ZWlJF-jX.mjs'),"/src/content/articles/mornington-peninsula-stay-and-soak.md": () => import('./mornington-peninsula-stay-and-soak_CUgClvNh.mjs'),"/src/content/articles/peninsula-hot-springs-vs-alba.md": () => import('./peninsula-hot-springs-vs-alba_D704X3ht.mjs'),"/src/content/articles/peninsula-this-weekend-april-18.md": () => import('./peninsula-this-weekend-april-18_Bd754rAe.mjs'),"/src/content/articles/rainy-day-peninsula.md": () => import('./rainy-day-peninsula_BUs99bbn.mjs'),"/src/content/articles/st-andrews-beach-golf-course.md": () => import('./st-andrews-beach-golf-course_C2gJxdhU.mjs'),"/src/content/articles/the-birthday-weekend.md": () => import('./the-birthday-weekend_37X-AUDg.mjs'),"/src/content/articles/the-cellar-door-short-list.md": () => import('./the-cellar-door-short-list_BoGnM98V.mjs'),"/src/content/articles/the-chardonnay-case.md": () => import('./the-chardonnay-case_svyyVeSC.mjs'),"/src/content/articles/the-couples-weekend.md": () => import('./the-couples-weekend_CYhZd3qw.mjs'),"/src/content/articles/the-dog-friendly-peninsula.md": () => import('./the-dog-friendly-peninsula_CXKNcwIK.mjs'),"/src/content/articles/the-easter-peninsula.md": () => import('./the-easter-peninsula_D6rsNiKv.mjs'),"/src/content/articles/the-four-hour-peninsula.md": () => import('./the-four-hour-peninsula_CeORiRW3.mjs'),"/src/content/articles/the-friday-night-arrival.md": () => import('./the-friday-night-arrival_BhbV_R8Q.mjs'),"/src/content/articles/the-long-lunch.md": () => import('./the-long-lunch_D8CPrdtI.mjs'),"/src/content/articles/the-market-saturday.md": () => import('./the-market-saturday_BJWidOIw.mjs'),"/src/content/articles/the-one-night-escape.md": () => import('./the-one-night-escape_GQzLNgGW.mjs'),"/src/content/articles/the-peninsula-beach-swimming-guide.md": () => import('./the-peninsula-beach-swimming-guide_BQEvSeFf.mjs'),"/src/content/articles/the-peninsula-orientation-drive.md": () => import('./the-peninsula-orientation-drive_DHJEWdy-.mjs'),"/src/content/articles/the-peninsula-pantry.md": () => import('./the-peninsula-pantry_pNxnF_Lk.mjs'),"/src/content/articles/the-peninsula-picnic.md": () => import('./the-peninsula-picnic_CzwtjZT-.mjs'),"/src/content/articles/the-peninsula-with-kids.md": () => import('./the-peninsula-with-kids_BcWOYtzR.mjs'),"/src/content/articles/the-peninsulas-best-late-afternoon-walks.md": () => import('./the-peninsulas-best-late-afternoon-walks_pTFcIwwl.mjs'),"/src/content/articles/the-point-nepean-half-day.md": () => import('./the-point-nepean-half-day_CAl_tEQI.mjs'),"/src/content/articles/the-producer-trail.md": () => import('./the-producer-trail_C5bhEsKZ.mjs'),"/src/content/articles/the-pub-crawl.md": () => import('./the-pub-crawl_BB76cpkH.mjs'),"/src/content/articles/the-pub-guide.md": () => import('./the-pub-guide_D4021tks.mjs'),"/src/content/articles/the-rainy-day-peninsula-without-a-booking.md": () => import('./the-rainy-day-peninsula-without-a-booking_DBmtedPJ.mjs'),"/src/content/articles/the-school-holidays-survival-guide.md": () => import('./the-school-holidays-survival-guide_B4pL2Sai.mjs'),"/src/content/articles/the-seafood-list.md": () => import('./the-seafood-list_B0YoInue.mjs'),"/src/content/articles/the-sorrento-weekend.md": () => import('./the-sorrento-weekend_BUVkqA-9.mjs'),"/src/content/articles/the-spring-peninsula.md": () => import('./the-spring-peninsula_DOT00-_U.mjs'),"/src/content/articles/the-sunset-drink.md": () => import('./the-sunset-drink_BFEe3UmI.mjs'),"/src/content/articles/the-sunset-hour.md": () => import('./the-sunset-hour_GUF8Zxu0.mjs'),"/src/content/articles/the-thermal-springs-weekend.md": () => import('./the-thermal-springs-weekend_Drgnm-n_.mjs'),"/src/content/articles/the-vineyard-villa-weekend.md": () => import('./the-vineyard-villa-weekend_C-7fB6_K.mjs'),"/src/content/articles/three-italian-dinners.md": () => import('./three-italian-dinners_k0u1dz7-.mjs'),"/src/content/articles/where-to-eat-without-a-booking.md": () => import('./where-to-eat-without-a-booking_7YMSqe-Y.mjs'),"/src/content/articles/where-to-stay-for-a-two-night-escape.md": () => import('./where-to-stay-for-a-two-night-escape_C5PCxcFx.mjs')});
const contentCollectionToEntryMap = createCollectionToGlobResultMap({
	globResult: contentEntryGlob,
	contentDir,
});

const dataEntryGlob = /* #__PURE__ */ Object.assign({"/src/content/authors/editorial.json": () => import('./editorial_BqDRCTfV.mjs'),"/src/content/events/alba-fire-and-ice-sessions.json": () => import('./alba-fire-and-ice-sessions_Dk-cO4qH.mjs'),"/src/content/events/anzac-day-sorrento-dawn.json": () => import('./anzac-day-sorrento-dawn_CDIVVmKw.mjs'),"/src/content/events/briars-eco-explorers-autumn.json": () => import('./briars-eco-explorers-autumn_C8p4LUFj.mjs'),"/src/content/events/chocolaterie-junior-chocolatier.json": () => import('./chocolaterie-junior-chocolatier_BmHBOOFN.mjs'),"/src/content/events/moonlit-sanctuary-easter-program.json": () => import('./moonlit-sanctuary-easter-program_D7ml6Pbo.mjs'),"/src/content/events/mornington-cup-2026.json": () => import('./mornington-cup-2026_Cuak6bPJ.mjs'),"/src/content/events/mprg-autumn-exhibition.json": () => import('./mprg-autumn-exhibition_k0sSDJRE.mjs'),"/src/content/events/peninsula-hot-springs-sunday-sessions.json": () => import('./peninsula-hot-springs-sunday-sessions_BVKQvg7p.mjs'),"/src/content/events/red-hill-market-first-saturday.json": () => import('./red-hill-market-first-saturday_BGbvz1Gn.mjs'),"/src/content/events/sorrento-writers-festival-2026.json": () => import('./sorrento-writers-festival-2026_DaODIxT8.mjs'),"/src/content/events/sunny-ridge-strawberry-picking.json": () => import('./sunny-ridge-strawberry-picking_D5uL0eSq.mjs'),"/src/content/events/winter-wine-weekend-june.json": () => import('./winter-wine-weekend-june_BQXB6KSP.mjs'),"/src/content/experiences/arthurs-seat-lookout.json": () => import('./arthurs-seat-lookout_CZZXEjvm.mjs'),"/src/content/experiences/balnarring-beach.json": () => import('./balnarring-beach_DUK6wBYF.mjs'),"/src/content/experiences/bushrangers-bay-walk.json": () => import('./bushrangers-bay-walk_BPc3OaBm.mjs'),"/src/content/experiences/bushrangers-bay.json": () => import('./bushrangers-bay_Cfu0zC8W.mjs'),"/src/content/experiences/cape-schanck-boardwalk.json": () => import('./cape-schanck-boardwalk_GPHflfmA.mjs'),"/src/content/experiences/cape-schanck-lighthouse-walk.json": () => import('./cape-schanck-lighthouse-walk_DKHy4rO3.mjs'),"/src/content/experiences/coastal-walk-cape-schanck.json": () => import('./coastal-walk-cape-schanck_DWR8hJNG.mjs'),"/src/content/experiences/coppins-track.json": () => import('./coppins-track_C6LRVCt0.mjs'),"/src/content/experiences/dromana-beach.json": () => import('./dromana-beach_C8kiOPNl.mjs'),"/src/content/experiences/eagle-ridge-golf-course.json": () => import('./eagle-ridge-golf-course_koSAOlH-.mjs'),"/src/content/experiences/farnsworth-track.json": () => import('./farnsworth-track_B4vrtrIX.mjs'),"/src/content/experiences/flinders-golf-club.json": () => import('./flinders-golf-club_Br0890kO.mjs'),"/src/content/experiences/greens-bush-two-bays-section.json": () => import('./greens-bush-two-bays-section_DR-MUsms.mjs'),"/src/content/experiences/gunnamatta-ocean-beach.json": () => import('./gunnamatta-ocean-beach_BbwvXkaA.mjs'),"/src/content/experiences/montalto-sculpture-trail.json": () => import('./montalto-sculpture-trail_BEuFG_Ee.mjs'),"/src/content/experiences/moonah-links.json": () => import('./moonah-links_BGv1VVlY.mjs'),"/src/content/experiences/mornington-foreshore-walk.json": () => import('./mornington-foreshore-walk_C8oyNEVc.mjs'),"/src/content/experiences/mornington-golf-club.json": () => import('./mornington-golf-club_CcfbLwFD.mjs'),"/src/content/experiences/mornington-peninsula-gallery.json": () => import('./mornington-peninsula-gallery_Bv7CxGQk.mjs'),"/src/content/experiences/mornington-peninsula-walk.json": () => import('./mornington-peninsula-walk_Bg-NEsZb.mjs'),"/src/content/experiences/mount-martha-beach.json": () => import('./mount-martha-beach_CvvP6ORw.mjs'),"/src/content/experiences/point-nepean-fort-walk.json": () => import('./point-nepean-fort-walk_DUjbOvaG.mjs'),"/src/content/experiences/point-nepean-national-park.json": () => import('./point-nepean-national-park_0cSpIVhS.mjs'),"/src/content/experiences/portsea-front-beach.json": () => import('./portsea-front-beach_BOYBcXWY.mjs'),"/src/content/experiences/portsea-golf-club.json": () => import('./portsea-golf-club_MadP9ELL.mjs'),"/src/content/experiences/pt-leo-sculpture-park.json": () => import('./pt-leo-sculpture-park_CqVItnyv.mjs'),"/src/content/experiences/racv-cape-schanck-golf-course.json": () => import('./racv-cape-schanck-golf-course_hRjV6fG7.mjs'),"/src/content/experiences/red-hill-hinterland-cycling.json": () => import('./red-hill-hinterland-cycling_DiuPqStY.mjs'),"/src/content/experiences/red-hill-market.json": () => import('./red-hill-market_Dp0NwQzL.mjs'),"/src/content/experiences/rosebud-country-club.json": () => import('./rosebud-country-club_DpT-BszK.mjs'),"/src/content/experiences/rye-ocean-beach.json": () => import('./rye-ocean-beach_D55AIQTp.mjs'),"/src/content/experiences/safety-beach-foreshore.json": () => import('./safety-beach-foreshore_rd09Upf8.mjs'),"/src/content/experiences/sea-search-encounters.json": () => import('./sea-search-encounters_oRLWCIQI.mjs'),"/src/content/experiences/sorrento-back-beach.json": () => import('./sorrento-back-beach_DKcqAZfm.mjs'),"/src/content/experiences/sorrento-ferry.json": () => import('./sorrento-ferry_ChtxArpO.mjs'),"/src/content/experiences/sorrento-golf-club.json": () => import('./sorrento-golf-club_s8gPDZ1g.mjs'),"/src/content/experiences/sorrento-ocean-baths.json": () => import('./sorrento-ocean-baths_C6ZcfoMz.mjs'),"/src/content/experiences/st-andrews-beach-golf-course.json": () => import('./st-andrews-beach-golf-course_bsGTK5HS.mjs'),"/src/content/experiences/summit-circuit-arthurs-seat.json": () => import('./summit-circuit-arthurs-seat_DwBbQvGN.mjs'),"/src/content/experiences/the-dunes-golf-links.json": () => import('./the-dunes-golf-links_BUAMel9o.mjs'),"/src/content/experiences/the-national-golf-club.json": () => import('./the-national-golf-club_DzOttgfq.mjs'),"/src/content/experiences/two-bays-walking-track.json": () => import('./two-bays-walking-track_BMpt3fyj.mjs'),"/src/content/itineraries/flinders-and-cape-reset.json": () => import('./flinders-and-cape-reset_CSkPvHsn.mjs'),"/src/content/itineraries/ridge-to-sea-two-night-escape.json": () => import('./ridge-to-sea-two-night-escape_CcvoFIPn.mjs'),"/src/content/itineraries/sorrento-off-season-weekend.json": () => import('./sorrento-off-season-weekend_DGfeKPN4.mjs'),"/src/content/itineraries/the-family-day-out.json": () => import('./the-family-day-out_C_0ukkHa.mjs'),"/src/content/itineraries/the-peninsula-golf-weekend.json": () => import('./the-peninsula-golf-weekend_CTIy73LM.mjs'),"/src/content/itineraries/wellness-weekend.json": () => import('./wellness-weekend_Dv5IxKrc.mjs'),"/src/content/places/balnarring.json": () => import('./balnarring_UPJArijB.mjs'),"/src/content/places/cape-schanck.json": () => import('./cape-schanck_D23vmrGP.mjs'),"/src/content/places/dromana.json": () => import('./dromana_D8oDsK_U.mjs'),"/src/content/places/flinders.json": () => import('./flinders_BFRTivt7.mjs'),"/src/content/places/hastings.json": () => import('./hastings_B68KRre7.mjs'),"/src/content/places/main-ridge.json": () => import('./main-ridge_DJtULzQS.mjs'),"/src/content/places/merricks.json": () => import('./merricks_C6JJ2s-j.mjs'),"/src/content/places/moorooduc.json": () => import('./moorooduc_rVAD33M6.mjs'),"/src/content/places/mornington.json": () => import('./mornington_CAH1PZJ1.mjs'),"/src/content/places/mount-martha.json": () => import('./mount-martha_BPGI04b1.mjs'),"/src/content/places/point-nepean.json": () => import('./point-nepean_Ciu7zav-.mjs'),"/src/content/places/portsea.json": () => import('./portsea_BNVvWYQj.mjs'),"/src/content/places/red-hill.json": () => import('./red-hill_Bw9FCKqO.mjs'),"/src/content/places/rosebud.json": () => import('./rosebud_Bjy27PMr.mjs'),"/src/content/places/rye.json": () => import('./rye_CiCdtTTP.mjs'),"/src/content/places/safety-beach.json": () => import('./safety-beach_VMQFF6E2.mjs'),"/src/content/places/shoreham.json": () => import('./shoreham_-xVKcf4_.mjs'),"/src/content/places/sorrento.json": () => import('./sorrento_BCUPsM80.mjs'),"/src/content/places/tuerong.json": () => import('./tuerong_C1ZuwjK4.mjs'),"/src/content/venues/advance-mussel-supply.json": () => import('./advance-mussel-supply_o8Ii8x1Y.mjs'),"/src/content/venues/afloat-mornington.json": () => import('./afloat-mornington_CKWuPrZX.mjs'),"/src/content/venues/alba-thermal-springs.json": () => import('./alba-thermal-springs_BnOCq0q7.mjs'),"/src/content/venues/allis-wine-bar.json": () => import('./allis-wine-bar_DyNnEV3N.mjs'),"/src/content/venues/ashcombe-maze.json": () => import('./ashcombe-maze_CTTw3zQt.mjs'),"/src/content/venues/avani-wines.json": () => import('./avani-wines_B1gZYcsQ.mjs'),"/src/content/venues/azuma-japanese.json": () => import('./azuma-japanese_Cr2C7wjd.mjs'),"/src/content/venues/baillieu-vineyard.json": () => import('./baillieu-vineyard_OJJKYZTy.mjs'),"/src/content/venues/balnarring-bakehouse.json": () => import('./balnarring-bakehouse_CzwLKHp9.mjs'),"/src/content/venues/balnarring-market.json": () => import('./balnarring-market_CUCHNe8I.mjs'),"/src/content/venues/balnarring-pub.json": () => import('./balnarring-pub_B0G_cTJN.mjs'),"/src/content/venues/barmah-park-vineyard.json": () => import('./barmah-park-vineyard_slA3zv_y.mjs'),"/src/content/venues/barmah-park.json": () => import('./barmah-park_DJEiOTHs.mjs'),"/src/content/venues/barragunda-dining.json": () => import('./barragunda-dining_XaOHTc3s.mjs'),"/src/content/venues/bass-and-flinders.json": () => import('./bass-and-flinders_BwJWrRHG.mjs'),"/src/content/venues/bistro-elba.json": () => import('./bistro-elba_W-x8vI51.mjs'),"/src/content/venues/cedar-and-pine.json": () => import('./cedar-and-pine_OAO2SSiY.mjs'),"/src/content/venues/ciao-amici.json": () => import('./ciao-amici_TRhFg4Gh.mjs'),"/src/content/venues/circe-wines.json": () => import('./circe-wines_wLWQazz8.mjs'),"/src/content/venues/commonfolk-coffee.json": () => import('./commonfolk-coffee_DfgVYY02.mjs'),"/src/content/venues/crittenden-estate.json": () => import('./crittenden-estate_CXvCKe54.mjs'),"/src/content/venues/crittenden-villas.json": () => import('./crittenden-villas_DGD8RSJh.mjs'),"/src/content/venues/dexter-wines.json": () => import('./dexter-wines_B9hP011k.mjs'),"/src/content/venues/doot-doot-doot.json": () => import('./doot-doot-doot_nswLIWjO.mjs'),"/src/content/venues/dromana-estate.json": () => import('./dromana-estate_t1aU0thL.mjs'),"/src/content/venues/dromana-hotel.json": () => import('./dromana-hotel_DMZtv0lM.mjs'),"/src/content/venues/elan-vineyard.json": () => import('./elan-vineyard_Lbvbhqlb.mjs'),"/src/content/venues/eldridge-estate.json": () => import('./eldridge-estate_BBk7Wpxh.mjs'),"/src/content/venues/elgee-park.json": () => import('./elgee-park_CTI1NlWS.mjs'),"/src/content/venues/endota-spa-mornington.json": () => import('./endota-spa-mornington_DfFjT6ln.mjs'),"/src/content/venues/endota-spa-sorrento.json": () => import('./endota-spa-sorrento_C2ENjrHL.mjs'),"/src/content/venues/epicurean-red-hill.json": () => import('./epicurean-red-hill_CC-24Q04.mjs'),"/src/content/venues/flinders-general-store.json": () => import('./flinders-general-store_BSDA04U7.mjs'),"/src/content/venues/flinders-hotel.json": () => import('./flinders-hotel_CG1YDAyq.mjs'),"/src/content/venues/flinders-pier-takeaway.json": () => import('./flinders-pier-takeaway_DMHORiso.mjs'),"/src/content/venues/flinders-sourdough.json": () => import('./flinders-sourdough_B1IJq-G3.mjs'),"/src/content/venues/foxeys-hangout.json": () => import('./foxeys-hangout_CICYG8GV.mjs'),"/src/content/venues/garagiste.json": () => import('./garagiste_D3IUp_5A.mjs'),"/src/content/venues/green-olive-red-hill.json": () => import('./green-olive-red-hill_yZmLKMJ9.mjs'),"/src/content/venues/hastings-fishermens-coop.json": () => import('./hastings-fishermens-coop_CrnujVcV.mjs'),"/src/content/venues/hillview-cottages.json": () => import('./hillview-cottages_Dq1F8IA3.mjs'),"/src/content/venues/hotel-sorrento.json": () => import('./hotel-sorrento_BGvVJNX2.mjs'),"/src/content/venues/hurley-vineyard.json": () => import('./hurley-vineyard_CNAQaxj6.mjs'),"/src/content/venues/jackalope.json": () => import('./jackalope_CX4cO18v.mjs'),"/src/content/venues/jetty-road-brewery.json": () => import('./jetty-road-brewery_DJ80Hd9r.mjs'),"/src/content/venues/johnny-ripe.json": () => import('./johnny-ripe_DIPJfF9l.mjs'),"/src/content/venues/kerri-greens.json": () => import('./kerri-greens_Ia7wl1PK.mjs'),"/src/content/venues/kooyong.json": () => import('./kooyong_DdmQ8gGz.mjs'),"/src/content/venues/la-baracca-tgallant.json": () => import('./la-baracca-tgallant_BcB-cAY0.mjs'),"/src/content/venues/laura-pt-leo.json": () => import('./laura-pt-leo_CRP1_-5o.mjs'),"/src/content/venues/lightfoot-wines.json": () => import('./lightfoot-wines_mU4ZDLVK.mjs'),"/src/content/venues/lindenderry.json": () => import('./lindenderry_Chz5s2Y9.mjs'),"/src/content/venues/main-ridge-dairy.json": () => import('./main-ridge-dairy_Do7pWMNt.mjs'),"/src/content/venues/main-ridge-estate.json": () => import('./main-ridge-estate_Bud0RLIj.mjs'),"/src/content/venues/many-little.json": () => import('./many-little_DWrr_lnA.mjs'),"/src/content/venues/martha-s-table.json": () => import('./martha-s-table_Nh81EVpt.mjs'),"/src/content/venues/maxs-red-hill-estate.json": () => import('./maxs-red-hill-estate_CCVYUTsI.mjs'),"/src/content/venues/merricks-estate.json": () => import('./merricks-estate_CQ04kti6.mjs'),"/src/content/venues/merricks-general-wine-store.json": () => import('./merricks-general-wine-store_DxleHa6l.mjs'),"/src/content/venues/merricks-hotel.json": () => import('./merricks-hotel_CGicoO0t.mjs'),"/src/content/venues/montalto.json": () => import('./montalto_DrepsKrO.mjs'),"/src/content/venues/moorooduc-estate.json": () => import('./moorooduc-estate_Cbhx1yqF.mjs'),"/src/content/venues/morning-sun.json": () => import('./morning-sun__5UhX769.mjs'),"/src/content/venues/mornington-dumpling-house.json": () => import('./mornington-dumpling-house_DGHtwYqv.mjs'),"/src/content/venues/mornington-farmers-market.json": () => import('./mornington-farmers-market_HUjryA-h.mjs'),"/src/content/venues/mornington-hotel.json": () => import('./mornington-hotel_FH9nCast.mjs'),"/src/content/venues/mornington-peninsula-brewery.json": () => import('./mornington-peninsula-brewery_DAf0KFd5.mjs'),"/src/content/venues/mornington-peninsula-chocolates.json": () => import('./mornington-peninsula-chocolates_BYav0fTL.mjs'),"/src/content/venues/mornington-peninsula-cider.json": () => import('./mornington-peninsula-cider_BddqVM0R.mjs'),"/src/content/venues/mr-vincenzos.json": () => import('./mr-vincenzos_LuYyTidJ.mjs'),"/src/content/venues/nazaaray-estate.json": () => import('./nazaaray-estate_CRuozdYE.mjs'),"/src/content/venues/ocean-eight.json": () => import('./ocean-eight_bEUFFZ1m.mjs'),"/src/content/venues/onannon.json": () => import('./onannon_YOXoIKJq.mjs'),"/src/content/venues/one-spa-racv-cape-schanck.json": () => import('./one-spa-racv-cape-schanck_zBg6leJ_.mjs'),"/src/content/venues/ouest-france-bistro.json": () => import('./ouest-france-bistro_CtCnvbp7.mjs'),"/src/content/venues/pane-e-vino.json": () => import('./pane-e-vino_1RGL5LJn.mjs'),"/src/content/venues/paradigm-hill.json": () => import('./paradigm-hill_gXSDuT9R.mjs'),"/src/content/venues/paringa-estate.json": () => import('./paringa-estate_C3psKGTg.mjs'),"/src/content/venues/peninsula-fresh-organics.json": () => import('./peninsula-fresh-organics_ClfXTfBS.mjs'),"/src/content/venues/peninsula-hot-springs-glamping.json": () => import('./peninsula-hot-springs-glamping_CtklfZun.mjs'),"/src/content/venues/peninsula-hot-springs.json": () => import('./peninsula-hot-springs_V-JlrXqM.mjs'),"/src/content/venues/phaedrus-estate.json": () => import('./phaedrus-estate_CDrYdcAy.mjs'),"/src/content/venues/pho-rosebud.json": () => import('./pho-rosebud_Dk25IYAy.mjs'),"/src/content/venues/pier-street-flinders.json": () => import('./pier-street-flinders_BXnfwVG_.mjs'),"/src/content/venues/pier-street-seafood.json": () => import('./pier-street-seafood_DtMTOxEP.mjs'),"/src/content/venues/point-leo-estate-villas.json": () => import('./point-leo-estate-villas_BZFhkcp3.mjs'),"/src/content/venues/point-leo-wine-terrace.json": () => import('./point-leo-wine-terrace_a6-CxjBi.mjs'),"/src/content/venues/polperro-villas.json": () => import('./polperro-villas_DDjMn2Ps.mjs'),"/src/content/venues/polperro.json": () => import('./polperro_Py79ryZ4.mjs'),"/src/content/venues/port-phillip-estate-restaurant.json": () => import('./port-phillip-estate-restaurant_qvzZSNR7.mjs'),"/src/content/venues/port-phillip-estate.json": () => import('./port-phillip-estate_BlhwmCWt.mjs'),"/src/content/venues/portsea-hotel.json": () => import('./portsea-hotel_CkyCyiSV.mjs'),"/src/content/venues/prancing-horse-estate.json": () => import('./prancing-horse-estate_D-utse1h.mjs'),"/src/content/venues/pt-leo-estate.json": () => import('./pt-leo-estate_BcmBKcX9.mjs'),"/src/content/venues/quealy-winemakers.json": () => import('./quealy-winemakers_CSADwW_w.mjs'),"/src/content/venues/rare-hare.json": () => import('./rare-hare_CLQ-op3V.mjs'),"/src/content/venues/red-gum-bbq.json": () => import('./red-gum-bbq_DlV_ffJr.mjs'),"/src/content/venues/red-hill-bakery.json": () => import('./red-hill-bakery_lmx9t-MI.mjs'),"/src/content/venues/red-hill-brewery.json": () => import('./red-hill-brewery_B9-_hgsB.mjs'),"/src/content/venues/red-hill-cheese.json": () => import('./red-hill-cheese_spU_8Auz.mjs'),"/src/content/venues/red-hill-estate.json": () => import('./red-hill-estate_BlKov62c.mjs'),"/src/content/venues/red-hill-market.json": () => import('./red-hill-market_BMtjeKQ-.mjs'),"/src/content/venues/red-hill-truffles.json": () => import('./red-hill-truffles_nsxtHiCj.mjs'),"/src/content/venues/rocker.json": () => import('./rocker_CT6VGYNU.mjs'),"/src/content/venues/rye-hotel.json": () => import('./rye-hotel_BvC2MJzB.mjs'),"/src/content/venues/scorpo-wines.json": () => import('./scorpo-wines_Bh3uieFz.mjs'),"/src/content/venues/small-stone-pantry.json": () => import('./small-stone-pantry_CAOXW0cX.mjs'),"/src/content/venues/somers-general.json": () => import('./somers-general_R11mR4aY.mjs'),"/src/content/venues/sorrento-bakery.json": () => import('./sorrento-bakery_BFYWN8Hj.mjs'),"/src/content/venues/sorrento-coastal-retreat.json": () => import('./sorrento-coastal-retreat_BoFNn1qO.mjs'),"/src/content/venues/sorrento-gelato.json": () => import('./sorrento-gelato_DWED_uSQ.mjs'),"/src/content/venues/sorrento-hotel.json": () => import('./sorrento-hotel_B4McqyP5.mjs'),"/src/content/venues/sourdough-kitchen.json": () => import('./sourdough-kitchen_DxxAofSF.mjs'),"/src/content/venues/spa-by-jackalope.json": () => import('./spa-by-jackalope_CCypdfF2.mjs'),"/src/content/venues/st-andrews-beach-brewery.json": () => import('./st-andrews-beach-brewery_Codtd3gU.mjs'),"/src/content/venues/stillwater-crittenden.json": () => import('./stillwater-crittenden_uKueqxDA.mjs'),"/src/content/venues/stonier-wines.json": () => import('./stonier-wines_CojPlDye.mjs'),"/src/content/venues/store-ten.json": () => import('./store-ten_CGe0Ub5h.mjs'),"/src/content/venues/stringers-mornington.json": () => import('./stringers-mornington_DTH9vCXl.mjs'),"/src/content/venues/stumpy-gully-vineyard.json": () => import('./stumpy-gully-vineyard_C65-UxDl.mjs'),"/src/content/venues/sunny-ridge-strawberry-farm.json": () => import('./sunny-ridge-strawberry-farm_BYvHULM4.mjs'),"/src/content/venues/t-gallant.json": () => import('./t-gallant_DueQapjf.mjs'),"/src/content/venues/tedesca-osteria.json": () => import('./tedesca-osteria_CoZQAeay.mjs'),"/src/content/venues/ten-minutes-by-tractor.json": () => import('./ten-minutes-by-tractor_BKkxHI-m.mjs'),"/src/content/venues/thai-orchid-mornington.json": () => import('./thai-orchid-mornington_D4PHbihm.mjs'),"/src/content/venues/the-baths-sorrento.json": () => import('./the-baths-sorrento_BzYbxJLe.mjs'),"/src/content/venues/the-bay-hotel-mornington.json": () => import('./the-bay-hotel-mornington_D6ANxEGY.mjs'),"/src/content/venues/the-continental-sorrento.json": () => import('./the-continental-sorrento_CjDZaLbU.mjs'),"/src/content/venues/the-rocks-mornington.json": () => import('./the-rocks-mornington_CWbEXHdq.mjs'),"/src/content/venues/trofeo-estate.json": () => import('./trofeo-estate_6o6syOxX.mjs'),"/src/content/venues/tucks-ridge.json": () => import('./tucks-ridge_K6AWF5PB.mjs'),"/src/content/venues/two-bays-brewing.json": () => import('./two-bays-brewing_CJPM-VsD.mjs'),"/src/content/venues/via-boffe.json": () => import('./via-boffe_Bvudsxi9.mjs'),"/src/content/venues/willow-creek-vineyard.json": () => import('./willow-creek-vineyard_CexBgV8n.mjs'),"/src/content/venues/yabby-lake.json": () => import('./yabby-lake_DsDy3NCx.mjs')});
const dataCollectionToEntryMap = createCollectionToGlobResultMap({
	globResult: dataEntryGlob,
	contentDir,
});
const collectionToEntryMap = createCollectionToGlobResultMap({
	globResult: { ...contentEntryGlob, ...dataEntryGlob },
	contentDir,
});

let lookupMap = {};
lookupMap = {"articles":{"type":"content","entries":{"a-winter-peninsula-weekend":"/src/content/articles/a-winter-peninsula-weekend.md","a-flinders-weekend":"/src/content/articles/a-flinders-weekend.md","best-golf-courses-mornington-peninsula":"/src/content/articles/best-golf-courses-mornington-peninsula.md","autumn-weekend-edit":"/src/content/articles/autumn-weekend-edit.md","best-spas-mornington-peninsula":"/src/content/articles/best-spas-mornington-peninsula.md","breakfast-before-the-crowds":"/src/content/articles/breakfast-before-the-crowds.md","how-to-build-a-red-hill-saturday":"/src/content/articles/how-to-build-a-red-hill-saturday.md","first-time-peninsula":"/src/content/articles/first-time-peninsula.md","how-to-plan-a-peninsula-weekend":"/src/content/articles/how-to-plan-a-peninsula-weekend.md","mornington-day-guide":"/src/content/articles/mornington-day-guide.md","mornington-peninsula-golf-guide":"/src/content/articles/mornington-peninsula-golf-guide.md","mornington-peninsula-stay-and-soak":"/src/content/articles/mornington-peninsula-stay-and-soak.md","mornington-peninsula-golf-stay-and-play":"/src/content/articles/mornington-peninsula-golf-stay-and-play.md","rainy-day-peninsula":"/src/content/articles/rainy-day-peninsula.md","peninsula-hot-springs-vs-alba":"/src/content/articles/peninsula-hot-springs-vs-alba.md","peninsula-this-weekend-april-18":"/src/content/articles/peninsula-this-weekend-april-18.md","the-birthday-weekend":"/src/content/articles/the-birthday-weekend.md","st-andrews-beach-golf-course":"/src/content/articles/st-andrews-beach-golf-course.md","the-chardonnay-case":"/src/content/articles/the-chardonnay-case.md","the-cellar-door-short-list":"/src/content/articles/the-cellar-door-short-list.md","the-dog-friendly-peninsula":"/src/content/articles/the-dog-friendly-peninsula.md","the-couples-weekend":"/src/content/articles/the-couples-weekend.md","the-easter-peninsula":"/src/content/articles/the-easter-peninsula.md","the-four-hour-peninsula":"/src/content/articles/the-four-hour-peninsula.md","the-friday-night-arrival":"/src/content/articles/the-friday-night-arrival.md","the-long-lunch":"/src/content/articles/the-long-lunch.md","the-one-night-escape":"/src/content/articles/the-one-night-escape.md","the-market-saturday":"/src/content/articles/the-market-saturday.md","the-peninsula-beach-swimming-guide":"/src/content/articles/the-peninsula-beach-swimming-guide.md","the-peninsula-orientation-drive":"/src/content/articles/the-peninsula-orientation-drive.md","the-peninsula-with-kids":"/src/content/articles/the-peninsula-with-kids.md","the-peninsula-picnic":"/src/content/articles/the-peninsula-picnic.md","the-peninsula-pantry":"/src/content/articles/the-peninsula-pantry.md","the-peninsulas-best-late-afternoon-walks":"/src/content/articles/the-peninsulas-best-late-afternoon-walks.md","the-point-nepean-half-day":"/src/content/articles/the-point-nepean-half-day.md","the-pub-guide":"/src/content/articles/the-pub-guide.md","the-pub-crawl":"/src/content/articles/the-pub-crawl.md","the-producer-trail":"/src/content/articles/the-producer-trail.md","the-rainy-day-peninsula-without-a-booking":"/src/content/articles/the-rainy-day-peninsula-without-a-booking.md","the-school-holidays-survival-guide":"/src/content/articles/the-school-holidays-survival-guide.md","the-seafood-list":"/src/content/articles/the-seafood-list.md","the-sorrento-weekend":"/src/content/articles/the-sorrento-weekend.md","the-spring-peninsula":"/src/content/articles/the-spring-peninsula.md","the-sunset-hour":"/src/content/articles/the-sunset-hour.md","three-italian-dinners":"/src/content/articles/three-italian-dinners.md","the-sunset-drink":"/src/content/articles/the-sunset-drink.md","the-vineyard-villa-weekend":"/src/content/articles/the-vineyard-villa-weekend.md","the-thermal-springs-weekend":"/src/content/articles/the-thermal-springs-weekend.md","where-to-stay-for-a-two-night-escape":"/src/content/articles/where-to-stay-for-a-two-night-escape.md","where-to-eat-without-a-booking":"/src/content/articles/where-to-eat-without-a-booking.md"}},"authors":{"type":"data","entries":{"editorial":"/src/content/authors/editorial.json"}},"events":{"type":"data","entries":{"alba-fire-and-ice-sessions":"/src/content/events/alba-fire-and-ice-sessions.json","anzac-day-sorrento-dawn":"/src/content/events/anzac-day-sorrento-dawn.json","briars-eco-explorers-autumn":"/src/content/events/briars-eco-explorers-autumn.json","chocolaterie-junior-chocolatier":"/src/content/events/chocolaterie-junior-chocolatier.json","moonlit-sanctuary-easter-program":"/src/content/events/moonlit-sanctuary-easter-program.json","mornington-cup-2026":"/src/content/events/mornington-cup-2026.json","mprg-autumn-exhibition":"/src/content/events/mprg-autumn-exhibition.json","peninsula-hot-springs-sunday-sessions":"/src/content/events/peninsula-hot-springs-sunday-sessions.json","red-hill-market-first-saturday":"/src/content/events/red-hill-market-first-saturday.json","sorrento-writers-festival-2026":"/src/content/events/sorrento-writers-festival-2026.json","sunny-ridge-strawberry-picking":"/src/content/events/sunny-ridge-strawberry-picking.json","winter-wine-weekend-june":"/src/content/events/winter-wine-weekend-june.json"}},"experiences":{"type":"data","entries":{"arthurs-seat-lookout":"/src/content/experiences/arthurs-seat-lookout.json","balnarring-beach":"/src/content/experiences/balnarring-beach.json","bushrangers-bay-walk":"/src/content/experiences/bushrangers-bay-walk.json","bushrangers-bay":"/src/content/experiences/bushrangers-bay.json","cape-schanck-boardwalk":"/src/content/experiences/cape-schanck-boardwalk.json","cape-schanck-lighthouse-walk":"/src/content/experiences/cape-schanck-lighthouse-walk.json","coastal-walk-cape-schanck":"/src/content/experiences/coastal-walk-cape-schanck.json","coppins-track":"/src/content/experiences/coppins-track.json","dromana-beach":"/src/content/experiences/dromana-beach.json","eagle-ridge-golf-course":"/src/content/experiences/eagle-ridge-golf-course.json","farnsworth-track":"/src/content/experiences/farnsworth-track.json","flinders-golf-club":"/src/content/experiences/flinders-golf-club.json","greens-bush-two-bays-section":"/src/content/experiences/greens-bush-two-bays-section.json","gunnamatta-ocean-beach":"/src/content/experiences/gunnamatta-ocean-beach.json","montalto-sculpture-trail":"/src/content/experiences/montalto-sculpture-trail.json","moonah-links":"/src/content/experiences/moonah-links.json","mornington-foreshore-walk":"/src/content/experiences/mornington-foreshore-walk.json","mornington-golf-club":"/src/content/experiences/mornington-golf-club.json","mornington-peninsula-gallery":"/src/content/experiences/mornington-peninsula-gallery.json","mornington-peninsula-walk":"/src/content/experiences/mornington-peninsula-walk.json","mount-martha-beach":"/src/content/experiences/mount-martha-beach.json","point-nepean-fort-walk":"/src/content/experiences/point-nepean-fort-walk.json","point-nepean-national-park":"/src/content/experiences/point-nepean-national-park.json","portsea-front-beach":"/src/content/experiences/portsea-front-beach.json","portsea-golf-club":"/src/content/experiences/portsea-golf-club.json","pt-leo-sculpture-park":"/src/content/experiences/pt-leo-sculpture-park.json","racv-cape-schanck-golf-course":"/src/content/experiences/racv-cape-schanck-golf-course.json","red-hill-hinterland-cycling":"/src/content/experiences/red-hill-hinterland-cycling.json","red-hill-market":"/src/content/experiences/red-hill-market.json","rosebud-country-club":"/src/content/experiences/rosebud-country-club.json","rye-ocean-beach":"/src/content/experiences/rye-ocean-beach.json","safety-beach-foreshore":"/src/content/experiences/safety-beach-foreshore.json","sea-search-encounters":"/src/content/experiences/sea-search-encounters.json","sorrento-back-beach":"/src/content/experiences/sorrento-back-beach.json","sorrento-ferry":"/src/content/experiences/sorrento-ferry.json","sorrento-golf-club":"/src/content/experiences/sorrento-golf-club.json","sorrento-ocean-baths":"/src/content/experiences/sorrento-ocean-baths.json","st-andrews-beach-golf-course":"/src/content/experiences/st-andrews-beach-golf-course.json","summit-circuit-arthurs-seat":"/src/content/experiences/summit-circuit-arthurs-seat.json","the-dunes-golf-links":"/src/content/experiences/the-dunes-golf-links.json","the-national-golf-club":"/src/content/experiences/the-national-golf-club.json","two-bays-walking-track":"/src/content/experiences/two-bays-walking-track.json"}},"itineraries":{"type":"data","entries":{"flinders-and-cape-reset":"/src/content/itineraries/flinders-and-cape-reset.json","ridge-to-sea-two-night-escape":"/src/content/itineraries/ridge-to-sea-two-night-escape.json","sorrento-off-season-weekend":"/src/content/itineraries/sorrento-off-season-weekend.json","the-family-day-out":"/src/content/itineraries/the-family-day-out.json","the-peninsula-golf-weekend":"/src/content/itineraries/the-peninsula-golf-weekend.json","wellness-weekend":"/src/content/itineraries/wellness-weekend.json"}},"places":{"type":"data","entries":{"balnarring":"/src/content/places/balnarring.json","cape-schanck":"/src/content/places/cape-schanck.json","dromana":"/src/content/places/dromana.json","flinders":"/src/content/places/flinders.json","hastings":"/src/content/places/hastings.json","main-ridge":"/src/content/places/main-ridge.json","merricks":"/src/content/places/merricks.json","moorooduc":"/src/content/places/moorooduc.json","mornington":"/src/content/places/mornington.json","mount-martha":"/src/content/places/mount-martha.json","point-nepean":"/src/content/places/point-nepean.json","portsea":"/src/content/places/portsea.json","red-hill":"/src/content/places/red-hill.json","rosebud":"/src/content/places/rosebud.json","rye":"/src/content/places/rye.json","safety-beach":"/src/content/places/safety-beach.json","shoreham":"/src/content/places/shoreham.json","sorrento":"/src/content/places/sorrento.json","tuerong":"/src/content/places/tuerong.json"}},"venues":{"type":"data","entries":{"advance-mussel-supply":"/src/content/venues/advance-mussel-supply.json","afloat-mornington":"/src/content/venues/afloat-mornington.json","alba-thermal-springs":"/src/content/venues/alba-thermal-springs.json","allis-wine-bar":"/src/content/venues/allis-wine-bar.json","ashcombe-maze":"/src/content/venues/ashcombe-maze.json","avani-wines":"/src/content/venues/avani-wines.json","azuma-japanese":"/src/content/venues/azuma-japanese.json","baillieu-vineyard":"/src/content/venues/baillieu-vineyard.json","balnarring-bakehouse":"/src/content/venues/balnarring-bakehouse.json","balnarring-market":"/src/content/venues/balnarring-market.json","balnarring-pub":"/src/content/venues/balnarring-pub.json","barmah-park-vineyard":"/src/content/venues/barmah-park-vineyard.json","barmah-park":"/src/content/venues/barmah-park.json","barragunda-dining":"/src/content/venues/barragunda-dining.json","bass-and-flinders":"/src/content/venues/bass-and-flinders.json","bistro-elba":"/src/content/venues/bistro-elba.json","cedar-and-pine":"/src/content/venues/cedar-and-pine.json","ciao-amici":"/src/content/venues/ciao-amici.json","circe-wines":"/src/content/venues/circe-wines.json","commonfolk-coffee":"/src/content/venues/commonfolk-coffee.json","crittenden-estate":"/src/content/venues/crittenden-estate.json","crittenden-villas":"/src/content/venues/crittenden-villas.json","dexter-wines":"/src/content/venues/dexter-wines.json","doot-doot-doot":"/src/content/venues/doot-doot-doot.json","dromana-estate":"/src/content/venues/dromana-estate.json","dromana-hotel":"/src/content/venues/dromana-hotel.json","elan-vineyard":"/src/content/venues/elan-vineyard.json","eldridge-estate":"/src/content/venues/eldridge-estate.json","elgee-park":"/src/content/venues/elgee-park.json","endota-spa-mornington":"/src/content/venues/endota-spa-mornington.json","endota-spa-sorrento":"/src/content/venues/endota-spa-sorrento.json","epicurean-red-hill":"/src/content/venues/epicurean-red-hill.json","flinders-general-store":"/src/content/venues/flinders-general-store.json","flinders-hotel":"/src/content/venues/flinders-hotel.json","flinders-pier-takeaway":"/src/content/venues/flinders-pier-takeaway.json","flinders-sourdough":"/src/content/venues/flinders-sourdough.json","foxeys-hangout":"/src/content/venues/foxeys-hangout.json","garagiste":"/src/content/venues/garagiste.json","green-olive-red-hill":"/src/content/venues/green-olive-red-hill.json","hastings-fishermens-coop":"/src/content/venues/hastings-fishermens-coop.json","hillview-cottages":"/src/content/venues/hillview-cottages.json","hotel-sorrento":"/src/content/venues/hotel-sorrento.json","hurley-vineyard":"/src/content/venues/hurley-vineyard.json","jackalope":"/src/content/venues/jackalope.json","jetty-road-brewery":"/src/content/venues/jetty-road-brewery.json","johnny-ripe":"/src/content/venues/johnny-ripe.json","kerri-greens":"/src/content/venues/kerri-greens.json","kooyong":"/src/content/venues/kooyong.json","la-baracca-tgallant":"/src/content/venues/la-baracca-tgallant.json","laura-pt-leo":"/src/content/venues/laura-pt-leo.json","lightfoot-wines":"/src/content/venues/lightfoot-wines.json","lindenderry":"/src/content/venues/lindenderry.json","main-ridge-dairy":"/src/content/venues/main-ridge-dairy.json","main-ridge-estate":"/src/content/venues/main-ridge-estate.json","many-little":"/src/content/venues/many-little.json","martha-s-table":"/src/content/venues/martha-s-table.json","maxs-red-hill-estate":"/src/content/venues/maxs-red-hill-estate.json","merricks-estate":"/src/content/venues/merricks-estate.json","merricks-general-wine-store":"/src/content/venues/merricks-general-wine-store.json","merricks-hotel":"/src/content/venues/merricks-hotel.json","montalto":"/src/content/venues/montalto.json","moorooduc-estate":"/src/content/venues/moorooduc-estate.json","morning-sun":"/src/content/venues/morning-sun.json","mornington-dumpling-house":"/src/content/venues/mornington-dumpling-house.json","mornington-farmers-market":"/src/content/venues/mornington-farmers-market.json","mornington-hotel":"/src/content/venues/mornington-hotel.json","mornington-peninsula-brewery":"/src/content/venues/mornington-peninsula-brewery.json","mornington-peninsula-chocolates":"/src/content/venues/mornington-peninsula-chocolates.json","mornington-peninsula-cider":"/src/content/venues/mornington-peninsula-cider.json","mr-vincenzos":"/src/content/venues/mr-vincenzos.json","nazaaray-estate":"/src/content/venues/nazaaray-estate.json","ocean-eight":"/src/content/venues/ocean-eight.json","onannon":"/src/content/venues/onannon.json","one-spa-racv-cape-schanck":"/src/content/venues/one-spa-racv-cape-schanck.json","ouest-france-bistro":"/src/content/venues/ouest-france-bistro.json","pane-e-vino":"/src/content/venues/pane-e-vino.json","paradigm-hill":"/src/content/venues/paradigm-hill.json","paringa-estate":"/src/content/venues/paringa-estate.json","peninsula-fresh-organics":"/src/content/venues/peninsula-fresh-organics.json","peninsula-hot-springs-glamping":"/src/content/venues/peninsula-hot-springs-glamping.json","peninsula-hot-springs":"/src/content/venues/peninsula-hot-springs.json","phaedrus-estate":"/src/content/venues/phaedrus-estate.json","pho-rosebud":"/src/content/venues/pho-rosebud.json","pier-street-flinders":"/src/content/venues/pier-street-flinders.json","pier-street-seafood":"/src/content/venues/pier-street-seafood.json","point-leo-estate-villas":"/src/content/venues/point-leo-estate-villas.json","point-leo-wine-terrace":"/src/content/venues/point-leo-wine-terrace.json","polperro-villas":"/src/content/venues/polperro-villas.json","polperro":"/src/content/venues/polperro.json","port-phillip-estate-restaurant":"/src/content/venues/port-phillip-estate-restaurant.json","port-phillip-estate":"/src/content/venues/port-phillip-estate.json","portsea-hotel":"/src/content/venues/portsea-hotel.json","prancing-horse-estate":"/src/content/venues/prancing-horse-estate.json","pt-leo-estate":"/src/content/venues/pt-leo-estate.json","quealy-winemakers":"/src/content/venues/quealy-winemakers.json","rare-hare":"/src/content/venues/rare-hare.json","red-gum-bbq":"/src/content/venues/red-gum-bbq.json","red-hill-bakery":"/src/content/venues/red-hill-bakery.json","red-hill-brewery":"/src/content/venues/red-hill-brewery.json","red-hill-cheese":"/src/content/venues/red-hill-cheese.json","red-hill-estate":"/src/content/venues/red-hill-estate.json","red-hill-market":"/src/content/venues/red-hill-market.json","red-hill-truffles":"/src/content/venues/red-hill-truffles.json","rocker":"/src/content/venues/rocker.json","rye-hotel":"/src/content/venues/rye-hotel.json","scorpo-wines":"/src/content/venues/scorpo-wines.json","small-stone-pantry":"/src/content/venues/small-stone-pantry.json","somers-general":"/src/content/venues/somers-general.json","sorrento-bakery":"/src/content/venues/sorrento-bakery.json","sorrento-coastal-retreat":"/src/content/venues/sorrento-coastal-retreat.json","sorrento-gelato":"/src/content/venues/sorrento-gelato.json","sorrento-hotel":"/src/content/venues/sorrento-hotel.json","sourdough-kitchen":"/src/content/venues/sourdough-kitchen.json","spa-by-jackalope":"/src/content/venues/spa-by-jackalope.json","st-andrews-beach-brewery":"/src/content/venues/st-andrews-beach-brewery.json","stillwater-crittenden":"/src/content/venues/stillwater-crittenden.json","stonier-wines":"/src/content/venues/stonier-wines.json","store-ten":"/src/content/venues/store-ten.json","stringers-mornington":"/src/content/venues/stringers-mornington.json","stumpy-gully-vineyard":"/src/content/venues/stumpy-gully-vineyard.json","sunny-ridge-strawberry-farm":"/src/content/venues/sunny-ridge-strawberry-farm.json","t-gallant":"/src/content/venues/t-gallant.json","tedesca-osteria":"/src/content/venues/tedesca-osteria.json","ten-minutes-by-tractor":"/src/content/venues/ten-minutes-by-tractor.json","thai-orchid-mornington":"/src/content/venues/thai-orchid-mornington.json","the-baths-sorrento":"/src/content/venues/the-baths-sorrento.json","the-bay-hotel-mornington":"/src/content/venues/the-bay-hotel-mornington.json","the-continental-sorrento":"/src/content/venues/the-continental-sorrento.json","the-rocks-mornington":"/src/content/venues/the-rocks-mornington.json","trofeo-estate":"/src/content/venues/trofeo-estate.json","tucks-ridge":"/src/content/venues/tucks-ridge.json","two-bays-brewing":"/src/content/venues/two-bays-brewing.json","via-boffe":"/src/content/venues/via-boffe.json","willow-creek-vineyard":"/src/content/venues/willow-creek-vineyard.json","yabby-lake":"/src/content/venues/yabby-lake.json"}}};

const collectionNames = new Set(Object.keys(lookupMap));

function createGlobLookup(glob) {
	return async (collection, lookupId) => {
		const filePath = lookupMap[collection]?.entries[lookupId];

		if (!filePath) return undefined;
		return glob[collection][filePath];
	};
}

const renderEntryGlob = /* #__PURE__ */ Object.assign({"/src/content/articles/a-flinders-weekend.md": () => import('./a-flinders-weekend_D_4SZrpr.mjs'),"/src/content/articles/a-winter-peninsula-weekend.md": () => import('./a-winter-peninsula-weekend_B2MAaQTM.mjs'),"/src/content/articles/autumn-weekend-edit.md": () => import('./autumn-weekend-edit_BlTmCaX_.mjs'),"/src/content/articles/best-golf-courses-mornington-peninsula.md": () => import('./best-golf-courses-mornington-peninsula_DJxcv65J.mjs'),"/src/content/articles/best-spas-mornington-peninsula.md": () => import('./best-spas-mornington-peninsula_Kydp-AgU.mjs'),"/src/content/articles/breakfast-before-the-crowds.md": () => import('./breakfast-before-the-crowds_BipAXtCE.mjs'),"/src/content/articles/first-time-peninsula.md": () => import('./first-time-peninsula_urvTlBRv.mjs'),"/src/content/articles/how-to-build-a-red-hill-saturday.md": () => import('./how-to-build-a-red-hill-saturday_UlNy4lFt.mjs'),"/src/content/articles/how-to-plan-a-peninsula-weekend.md": () => import('./how-to-plan-a-peninsula-weekend_EOX1hZ7U.mjs'),"/src/content/articles/mornington-day-guide.md": () => import('./mornington-day-guide_YXHaIyz-.mjs'),"/src/content/articles/mornington-peninsula-golf-guide.md": () => import('./mornington-peninsula-golf-guide_DBuCIz1S.mjs'),"/src/content/articles/mornington-peninsula-golf-stay-and-play.md": () => import('./mornington-peninsula-golf-stay-and-play_wjFJYSaC.mjs'),"/src/content/articles/mornington-peninsula-stay-and-soak.md": () => import('./mornington-peninsula-stay-and-soak_DWzFHlen.mjs'),"/src/content/articles/peninsula-hot-springs-vs-alba.md": () => import('./peninsula-hot-springs-vs-alba_BIJ0jUky.mjs'),"/src/content/articles/peninsula-this-weekend-april-18.md": () => import('./peninsula-this-weekend-april-18_DJBK-JZq.mjs'),"/src/content/articles/rainy-day-peninsula.md": () => import('./rainy-day-peninsula_BtUAIvZ3.mjs'),"/src/content/articles/st-andrews-beach-golf-course.md": () => import('./st-andrews-beach-golf-course_dXuygwDf.mjs'),"/src/content/articles/the-birthday-weekend.md": () => import('./the-birthday-weekend_BkPiGwDq.mjs'),"/src/content/articles/the-cellar-door-short-list.md": () => import('./the-cellar-door-short-list_Dn_RxwjK.mjs'),"/src/content/articles/the-chardonnay-case.md": () => import('./the-chardonnay-case_BFpVmGYU.mjs'),"/src/content/articles/the-couples-weekend.md": () => import('./the-couples-weekend_BR32ccJO.mjs'),"/src/content/articles/the-dog-friendly-peninsula.md": () => import('./the-dog-friendly-peninsula_DMvF7_LL.mjs'),"/src/content/articles/the-easter-peninsula.md": () => import('./the-easter-peninsula_DTlSp1a4.mjs'),"/src/content/articles/the-four-hour-peninsula.md": () => import('./the-four-hour-peninsula_BPwPMHEn.mjs'),"/src/content/articles/the-friday-night-arrival.md": () => import('./the-friday-night-arrival_Dm9N7dZi.mjs'),"/src/content/articles/the-long-lunch.md": () => import('./the-long-lunch_T9UoDwdX.mjs'),"/src/content/articles/the-market-saturday.md": () => import('./the-market-saturday_DlWak3Sh.mjs'),"/src/content/articles/the-one-night-escape.md": () => import('./the-one-night-escape_yM07PMS8.mjs'),"/src/content/articles/the-peninsula-beach-swimming-guide.md": () => import('./the-peninsula-beach-swimming-guide_D-DDKPJc.mjs'),"/src/content/articles/the-peninsula-orientation-drive.md": () => import('./the-peninsula-orientation-drive__0ZjeiO2.mjs'),"/src/content/articles/the-peninsula-pantry.md": () => import('./the-peninsula-pantry_BHQwwqPy.mjs'),"/src/content/articles/the-peninsula-picnic.md": () => import('./the-peninsula-picnic_DHVBVVYa.mjs'),"/src/content/articles/the-peninsula-with-kids.md": () => import('./the-peninsula-with-kids_CqTsvZFQ.mjs'),"/src/content/articles/the-peninsulas-best-late-afternoon-walks.md": () => import('./the-peninsulas-best-late-afternoon-walks_DB8YgNEL.mjs'),"/src/content/articles/the-point-nepean-half-day.md": () => import('./the-point-nepean-half-day_CNquSxtC.mjs'),"/src/content/articles/the-producer-trail.md": () => import('./the-producer-trail_BnTcdTS8.mjs'),"/src/content/articles/the-pub-crawl.md": () => import('./the-pub-crawl_Bsq__mVC.mjs'),"/src/content/articles/the-pub-guide.md": () => import('./the-pub-guide_BlC3SKsW.mjs'),"/src/content/articles/the-rainy-day-peninsula-without-a-booking.md": () => import('./the-rainy-day-peninsula-without-a-booking_C-w9aKIS.mjs'),"/src/content/articles/the-school-holidays-survival-guide.md": () => import('./the-school-holidays-survival-guide_IVI5EM6K.mjs'),"/src/content/articles/the-seafood-list.md": () => import('./the-seafood-list_C4ACrAk0.mjs'),"/src/content/articles/the-sorrento-weekend.md": () => import('./the-sorrento-weekend_nsjT3PBO.mjs'),"/src/content/articles/the-spring-peninsula.md": () => import('./the-spring-peninsula_-kQgeB0H.mjs'),"/src/content/articles/the-sunset-drink.md": () => import('./the-sunset-drink_BK75WtXd.mjs'),"/src/content/articles/the-sunset-hour.md": () => import('./the-sunset-hour_6X8Ezdma.mjs'),"/src/content/articles/the-thermal-springs-weekend.md": () => import('./the-thermal-springs-weekend_BYKE-ls-.mjs'),"/src/content/articles/the-vineyard-villa-weekend.md": () => import('./the-vineyard-villa-weekend_XIOoPIIh.mjs'),"/src/content/articles/three-italian-dinners.md": () => import('./three-italian-dinners_6Jm_g1Ya.mjs'),"/src/content/articles/where-to-eat-without-a-booking.md": () => import('./where-to-eat-without-a-booking_Bokcf4mn.mjs'),"/src/content/articles/where-to-stay-for-a-two-night-escape.md": () => import('./where-to-stay-for-a-two-night-escape_C0rMfDI_.mjs')});
const collectionToRenderEntryMap = createCollectionToGlobResultMap({
	globResult: renderEntryGlob,
	contentDir,
});

const cacheEntriesByCollection = new Map();
const getCollection = createGetCollection({
	contentCollectionToEntryMap,
	dataCollectionToEntryMap,
	getRenderEntryImport: createGlobLookup(collectionToRenderEntryMap),
	cacheEntriesByCollection,
});

const getEntry = createGetEntry({
	getEntryImport: createGlobLookup(collectionToEntryMap),
	getRenderEntryImport: createGlobLookup(collectionToRenderEntryMap),
	collectionNames,
});

export { getEntry as a, getCollection as g };

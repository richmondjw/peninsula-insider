import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const allowedSocketModule = 'server/capture/transport.ts';
const allowedTransportCaller = 'server/capture/kernel.ts';
const allowedAddressParser = 'server/capture/policy.ts';
const violations = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    if (!entry.isFile() || !['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(extname(entry.name))) continue;
    const path = relative(root, absolute).replaceAll('\\', '/');
    const source = await readFile(absolute, 'utf8');
    if (/\bfetch\s*\(\s*(?!['"`]\/api\/)/.test(source)) {
      violations.push(`${path}: external or dynamic direct fetch is forbidden`);
    }
    const networkImport = /(?:from\s+|import\s*\(|require\s*\()\s*['"](?:node:)?(?:http|https|http2|net|tls|dgram|dns(?:\/promises)?)['"]/m.test(source);
    const addressParserOnly = path === allowedAddressParser
      && /import\s*{\s*isIP\s*}\s*from\s*['"]node:net['"]/.test(source)
      && !/\b(?:connect|createConnection|createServer)\s*\(/.test(source);
    if (path !== allowedSocketModule && networkImport && !addressParserOnly) {
      violations.push(`${path}: outbound socket APIs are reserved for ${allowedSocketModule}`);
    }
    if (path !== allowedTransportCaller && /from\s+['"][^'"]*(?:capture\/transport|\.\/transport)(?:\.js)?['"]/.test(source)) {
      violations.push(`${path}: the pinned transport may be called only by ${allowedTransportCaller}`);
    }
    if (![allowedTransportCaller, allowedSocketModule, allowedAddressParser, 'server/capture/transport-contract.ts'].includes(path)
      && /from\s+['"][^'"]*(?:capture\/policy|\.\/policy)(?:\.js)?['"]/.test(source)) {
      violations.push(`${path}: DNS and address policy may be called only inside the sealed kernel boundary`);
    }
    if (/(?:from\s+|import\s*\(|require\s*\()\s*['"](?:axios|got|node-fetch|undici)['"]/.test(source)) {
      violations.push(`${path}: direct HTTP client dependency is forbidden`);
    }
    if (/(?:from\s+|import\s*\(|require\s*\()\s*['"](?:node:)?child_process['"]|\b(?:exec|execFile|spawn|fork)\s*\(/.test(source)) {
      violations.push(`${path}: subprocess network bypass surfaces are forbidden`);
    }
    if (/\b(?:WebSocket|EventSource)\s*\(|navigator\.sendBeacon\s*\(/.test(source)) {
      violations.push(`${path}: alternate browser network surfaces are forbidden`);
    }
    if (/dangerouslySetInnerHTML|\.(?:inner|outer)HTML\s*=|insertAdjacentHTML\s*\(/.test(source)) {
      violations.push(`${path}: captured source markup must stay inert; raw HTML injection is forbidden`);
    }
  }
}

await walk(join(root, 'server'));
await walk(join(root, 'src'));

if (violations.length > 0) {
  process.stderr.write(`${violations.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('Capture boundary verified: outbound resolution and HTTPS remain inside the sealed kernel modules, and captured markup is never injected as HTML.\n');
}

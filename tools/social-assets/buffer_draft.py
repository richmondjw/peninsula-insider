#!/usr/bin/env python3
"""Push a single Peninsula Insider social post to Buffer as a draft.

Governance rule: every post created by this script lands in Buffer as a
draft (saveToDraft=true, status="draft"). Nothing it does ever publishes
or auto-schedules directly — Emma or James review and send from Buffer.

Verified against the live Buffer GraphQL API 2026-08-13 for both
instagram and linkedin channels (org 68d0ae8232af2ad45b4fc1c6).

Known Buffer plan limitation: --first-comment is rejected on this
account's plan ("requires a paid plan"). Until upgraded, put hashtags in
--text directly instead of relying on the first-comment field.

Usage:
  python3 buffer_draft.py \
    --platform instagram \
    --channel-id 69f5f6ca5c4c051afa0243e0 \
    --text "Caption text..." \
    --image-url "https://peninsulainsider.com.au/.../hero.jpg" \
    --link "https://peninsulainsider.com.au/journal/example/" \
    --first-comment "#mornington #peninsulainsider #sorrento" \
    --due-at "2026-08-20T10:00:00Z"

  python3 buffer_draft.py \
    --platform linkedin \
    --channel-id 69e58e43031bfa423c20f0bf \
    --text "Caption text with link in body..." \
    --due-at "2026-08-18T22:30:00Z"

Credentials are read from /home/node/.openclaw/credentials/buffer/env
(BUFFER_API_KEY). Override with --api-key or $BUFFER_API_KEY for testing.
"""

import argparse
import json
import os
import sys
import urllib.request

BUFFER_ENDPOINT = "https://api.buffer.com/graphql"
CREDENTIAL_FILE = "/home/node/.openclaw/credentials/buffer/env"

CREATE_POST_MUTATION = """
mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    ... on PostActionSuccess {
      post {
        id
        dueAt
        status
      }
    }
    ... on InvalidInputError {
      message
    }
    ... on UnauthorizedError {
      message
    }
    ... on LimitReachedError {
      message
    }
    ... on UnexpectedError {
      message
    }
  }
}
"""


def load_api_key(explicit_key):
    if explicit_key:
        return explicit_key
    if os.environ.get("BUFFER_API_KEY"):
        return os.environ["BUFFER_API_KEY"]
    if os.path.exists(CREDENTIAL_FILE):
        with open(CREDENTIAL_FILE) as f:
            for line in f:
                if line.startswith("BUFFER_API_KEY="):
                    return line.strip().split("=", 1)[1]
    raise SystemExit("No Buffer API key found (checked --api-key, $BUFFER_API_KEY, %s)" % CREDENTIAL_FILE)


def graphql(api_key, query, variables):
    body = json.dumps({"query": query, "variables": variables}).encode("utf-8")
    req = urllib.request.Request(
        BUFFER_ENDPOINT,
        data=body,
        headers={
            "Authorization": "Bearer %s" % api_key,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    if payload.get("errors"):
        raise SystemExit("Buffer API error: %s" % json.dumps(payload["errors"], indent=2))
    return payload["data"]


def build_metadata(platform, link, first_comment):
    if platform == "instagram":
        return {
            "instagram": {
                "type": "post",
                "shouldShareToFeed": True,
                "firstComment": first_comment or None,
                "link": link or None,
            }
        }
    if platform == "linkedin":
        meta = {"linkedin": {}}
        if first_comment:
            meta["linkedin"]["firstComment"] = first_comment
        if link:
            meta["linkedin"]["linkAttachment"] = {"url": link}
        return meta
    if platform == "facebook":
        return {"facebook": {"type": "post"}}
    return None


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--platform", required=True, choices=["instagram", "linkedin", "facebook"])
    parser.add_argument("--channel-id", required=True)
    parser.add_argument("--text", required=True, help="Caption body")
    parser.add_argument("--image-url", help="Public image URL (required for Instagram)")
    parser.add_argument("--link", help="Destination URL for this post")
    parser.add_argument("--first-comment", help="Hashtags/notes to post as the first comment (Instagram/LinkedIn)")
    parser.add_argument("--due-at", help="ISO8601 datetime this draft is intended for once approved (e.g. 2026-08-20T10:00:00Z)")
    parser.add_argument("--api-key", help="Override Buffer API key (defaults to credential file)")
    parser.add_argument("--dry-run", action="store_true", help="Print the mutation payload without calling Buffer")
    args = parser.parse_args()

    if args.platform == "instagram" and not args.image_url:
        raise SystemExit("Instagram drafts require --image-url")

    assets = []
    if args.image_url:
        assets.append({"image": {"url": args.image_url}})
    elif args.link:
        assets.append({"link": {"url": args.link}})

    variables = {
        "input": {
            "channelId": args.channel_id,
            "text": args.text,
            "assets": assets,
            "mode": "customScheduled" if args.due_at else "addToQueue",
            "schedulingType": "automatic",
            "needsApproval": False,
            "saveToDraft": True,
            "source": "pi-weekly-social-cron",
        }
    }
    if args.due_at:
        variables["input"]["dueAt"] = args.due_at
    metadata = build_metadata(args.platform, args.link, args.first_comment)
    if metadata:
        variables["input"]["metadata"] = metadata

    if args.dry_run:
        print(json.dumps(variables, indent=2))
        return

    api_key = load_api_key(args.api_key)
    data = graphql(api_key, CREATE_POST_MUTATION, variables)
    result = data["createPost"]
    print(json.dumps(result, indent=2))
    if "message" in result and "post" not in result:
        sys.exit(1)


if __name__ == "__main__":
    main()

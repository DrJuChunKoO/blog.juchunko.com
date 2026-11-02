---
title: "Missing iPhone Apps After Migration: Investigating Error 506 with App Restore Rescue"
description: "How a targeted uninstall restored an app download, what error 506 does and does not prove, and a privacy-conscious open-source macOS utility."
pubDate: "2026-11-02"
author: ["juchun-ko"]
categories: ["devlog", "hardware"]
---

After moving to a new iPhone, I could not find X. Its App Store page still showed the download cloud. Tapping it produced a brief spinner, then the cloud returned without an error. What eventually restored downloads was a narrowly scoped uninstall request from my Mac, followed by a fresh download from the App Store.

This is the story of how Codex and I investigated it, what we actually changed, and why I turned that workflow into an open-source macOS app called [App Restore Rescue](https://github.com/dAAAb/app-restore-rescue). The app scans a short monitoring session started by the user, or user-selected local logs, for candidate apps involved in restore conflicts. The user can then confirm an uninstall one app at a time. A spinning download button alone cannot establish that this is the right remedy.

My initial instruction was to investigate without changing anything. I had already finished setting up many accounts and apps on the new phone. I wanted evidence before choosing another disruptive step.

We found ample free storage, no relevant restriction enabled, no X entry in the Settings app list, and no message in iCloud Backup saying a whole-device restore was still running. Search and Siri optimization was incomplete. That could affect search, but it did not explain why the App Store rejected a download.

Some background activity after migration is expected. Apple explains that apps and other content can continue downloading after initial setup, and documents how to check iCloud restore status. Those descriptions establish normal behavior; they do not establish that my phone was still restoring normally or that every failed download has the same cause. [Apple’s restore guide](https://support.apple.com/en-us/118105), [checking for missing information after a restore](https://support.apple.com/en-us/102325).

The useful evidence came from the device logs. An X download attempt produced:

```text
ASDErrorDomain Code=506 "Duplicate restoring request"
```

Related messages showed an existing installation coordinator created by `AirTraffic` with the intent `Restoring`, while the corresponding placeholder was missing and the download asset was not being queued successfully.

A coordinator is part of the system’s bookkeeping for an installation task. A placeholder represents an unfinished app, and an asset is the content that needs downloading. Taken together, these messages supported a specific interpretation: an old X restore task still blocked a new request, while the work needed to finish that task was no longer connected properly.

That is an inference from the observed conflict, not a forensic finding about a particular database file. We did not inspect iOS’s internal database. The evidence did not establish global app database corruption, nor did it establish the event that originally caused the state. “Discovered after migration” describes the sequence; it does not prove that a particular iPhone model or iOS release caused it.

We also verified the app’s identity. The identifier `com.atebits.Tweetie2` looks surprisingly old, but it is the official X iOS app’s Bundle ID. X’s own association file lists `8248RGMF2D.com.atebits.Tweetie2`; its App Store product ID is `333903271`. A historical name in a technical identifier is not itself evidence of a problem. [X’s official association file](https://x.com/.well-known/apple-app-site-association), [X on the App Store](https://apps.apple.com/app/id333903271).

I wondered whether recent branding or product consolidation might be involved. The official subscription announcement does bring Grok, Grok Bot, Cursor, and X Premium together, and the page uses the SpaceXSI name. But a subscription package and an iOS installation identity are different things. We found no evidence connecting those changes to this download failure. [Official subscription announcement](https://x.ai/news/x-subscription).

Other people have reported similar problems, but the evidence needs separating:

| Public account | What it supports | What it does not establish |
| --- | --- | --- |
| PTT user cinnamo1208’s migration report | The same 506 message, missing app entries, and a reported recovery after computer-side intervention | A universal fix: a commenter reported failure with Google and X |
| A Reddit account of a Finder restore | An `AirTraffic` restore coordinator conflicting with a new installation intent | The post does not show the same 506 message or a confirmed resolution |
| Apple’s restore documentation | Background app downloads can continue after setup | Official acknowledgment or prevalence of this specific failure |

Credit goes to [cinnamo1208’s original PTT post](https://www.ptt.cc/bbs/iOS/M.1790676452.A.A8E.html), available with comments in [this readable mirror](https://pttdigits.com/iOS/1gkutagE). The [firsthand Reddit account](https://www.reddit.com/r/ios/comments/1s30yiz/app_store_downloads_stuck_after_backup_restore/) provides another comparison. These reports have no denominator or consistent testing method. They show that I am not the only person to encounter a related failure, but they cannot tell us how common it is.

Even `ASDErrorDomain 506` alone is insufficient. Jamf documents ordinary duplicate requests while a Mac app is still installing, and Microsoft documents a version-specific macOS installation problem with that code. The platform, complete error text, and restore context matter. [Jamf’s explanation](https://support.jamf.com/en/articles/11029608-mac-app-installation-fails-due-to-asderrordomain-506-duplicate-request-in-jamf-now), [Microsoft’s macOS case](https://learn.microsoft.com/en-us/troubleshoot/mem/intune/app-management/cannot-install-macos-apps-and-run-shell-scripts).

The PTT workaround involved an attempted installation of an older IPA followed by removal. In my case, we made fewer changes: after verifying the phone and Bundle ID, we submitted a targeted uninstall using the open-source `ideviceinstaller` tool. We did not obtain an unknown IPA or install an older copy of X.

The first attempt encountered a separate problem. Codex’s restricted execution environment returned `No device found`, even though the phone was connected and unlocked. Read-only enumeration from an environment allowed to access the USB device service found the correct phone. That comparison established an access difference in this session; the first message alone was not proof of a disconnected phone or faulty cable.

After checking connectivity and the exact authorization scope, I authorized a retry against that phone and that Bundle ID. It returned `Uninstall: Complete` with exit code `0`. I then manually retried the download on the iPhone. X downloaded successfully.

Both parts matter. The command reported a completed uninstall request. The successful App Store download established the outcome I cared about. It supports the conclusion that targeting this app’s installation state helped in this case, without proving that every 506 error has the same remedy.

**An uninstall is not a lossless cache cleanup. It may remove the app’s local data.** A missing icon does not prove that no data remains. Check any information or backups you need before proceeding. Apple’s own delete-and-reinstall guidance also warns that stored app data may be lost. [Apple’s app troubleshooting guidance](https://support.apple.com/en-us/119876).

App Restore Rescue makes the scope and confirmation visible. Its workflow is:

1. Connect the iPhone over USB, unlock it, and verify the intended device. If iOS asks whether to trust the computer, make and complete that decision yourself.
2. Start a short monitoring session for `appstored`, wait until the app reports “Listening,” then manually tap the affected app’s download cloud once on the iPhone and wait for the attempt to finish. Monitoring reads messages; tapping Download can actually install the app if the attempt succeeds. If an existing local log already contains the failure, import it instead. There is no need to reproduce it repeatedly.
3. Review candidates associated with `ASDErrorDomain 506`, `Duplicate restoring request`, and a Bundle ID. A candidate means the log contains a relevant error, not that the app is still broken. The tool does not tap Download, continuously collect full device logs in the background, or upload logs.
4. Select one candidate and run a read-only inspection. An absent app-list entry alone does not prove that no residual installation state exists. Verify the device and Bundle ID, read the data-deletion warning, and explicitly confirm the uninstall. There is no default bulk removal.
5. Return to the iPhone’s App Store and manually try the download again.

A log can contain old events, repaired problems, or records from a different device. Live monitoring can also miss an event because of timing, missing messages, or redacted information. No candidates does not mean that every app is healthy. The scan is an aid to investigation, not a complete inventory of every unfinished migration task. For ordinary download problems, start with [Apple’s download troubleshooting steps](https://support.apple.com/en-us/102632), including a normal restart and retry. If the problem persists, Apple Support can use a redacted description of the error for further investigation.

The app has no telemetry. Raw logs stay in local memory, and the interface masks device identifiers. Your logs and list of affected apps are still your information. Do not attach an unredacted diagnostic archive to a public issue.

The app requires a user-installed copy of `ideviceinstaller` 1.2 or newer and the associated device connection tools. The underlying communication and uninstall capability comes from [libimobiledevice](https://github.com/libimobiledevice/libimobiledevice) and [ideviceinstaller](https://github.com/libimobiledevice/ideviceinstaller). The latter is an independent GPL-licensed project, and its maintainers deserve credit for the capability this interface relies on. [Upstream license](https://github.com/libimobiledevice/ideviceinstaller/blob/1.2.0/COPYING).

You can also inspect the source and use the CLI without the GUI. These examples show the structure of our operation, with a placeholder instead of my device identifier. First, check the tool version and enumerate USB-connected devices without modifying them:

```sh
ideviceinstaller --version
idevice_id -l
```

Verify the intended device and replace `<YOUR_IPHONE_UDID>` with its identifier. **The next command requests an uninstall of X and may delete its local data. Run it only after confirming the target and accepting that consequence.** For another app, independently verify its Bundle ID; do not reuse X’s identifier.

```sh
ideviceinstaller -u '<YOUR_IPHONE_UDID>' uninstall com.atebits.Tweetie2
```

This is the ideviceinstaller 1.2 command interface; older releases use different options. It submits an ordinary uninstall request for one Bundle ID to the phone’s app installation service. It does not directly delete an internal coordinator by UUID. [Upstream usage](https://github.com/libimobiledevice/ideviceinstaller#usage), [version 1.2.0 source](https://github.com/libimobiledevice/ideviceinstaller/blob/1.2.0/src/ideviceinstaller.c). Always verify the result in the App Store. If it still fails, preserve a redacted error description rather than expanding the operation into an unspecified cleanup.

The source is at [dAAAb/app-restore-rescue](https://github.com/dAAAb/app-restore-rescue), with downloads on [GitHub Releases](https://github.com/dAAAb/app-restore-rescue/releases/latest). The initial macOS app is ad hoc signed. **It is not Developer ID signed or notarized by Apple.** It is not an Apple-provided or Apple-endorsed repair utility. If that distribution model does not meet your needs, review and build the source, or use the CLI workflow above.

What I can confirm is that X downloaded again after this precisely scoped uninstall. Publishing the case and the tool gives the next investigation something concrete to work with: evidence that can be checked, a limited operation, and an explicit decision before anything is removed.

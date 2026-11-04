# Profile and surface consistency

Shared material variables now drive canvas, cards, raised controls, fields and secondary text in all four worlds in day and night modes. Photo covers, chat wallpapers and Lounge retain their intentional identity. Short entry and control transitions respect reduced motion.

Lore Profile → Edit profile provides photo selection/change/removal, display name and bio with Save and Cancel. Existing PhotoField resizes photos and guards submission while preparing. Shared avatar is used in the shell, profile, composer, chapter timeline and own tagged feed media. Old backups without a photo remain valid; invalid or oversized photo sources are rejected. Public capabilities and links remain in the existing presence editor. Changes are device-local.

Validation: 88 automated tests pass, including identity photo round-trip and invalid source checks. Production build checked. Browser visual review and interactive photo selection remain pending because browser tools were unavailable in this turn.

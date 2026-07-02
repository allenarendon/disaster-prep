# PSGC location data

`locations.json` is generated from the [open-admin-data Philippines administrative divisions](https://github.com/open-admin-data/philippines-administrative-divisions) dataset (CC-BY-4.0).

Regenerate after updating the upstream source:

```bash
npm run generate:locations
```

This also re-syncs demo seed files (`data/seed/evac-centers.json`, `data/seed/bulletins.json`) to official barangay codes.

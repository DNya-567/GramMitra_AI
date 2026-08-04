# Project scope

## Problem statement
Farmers in India face two connected gaps: (1) agricultural advisory — crop
selection, fertilizer use, weather-based decisions — is often not available
in their own language, and (2) when something goes wrong (electricity
outage affecting irrigation, water supply issues, crop damage), there's no
simple way to know which government department to approach. This project
builds a single multilingual AI-assisted platform that gives farmers
proactive agricultural guidance in their own language and helps them
correctly route complaints to the right department.

## In scope (v1)
- Crop recommendation (soil + climate inputs → suggested crops)
- Weather-based advisory (live weather API → actionable tips)
- Fertilizer suggestion (crop + soil deficiency → recommendation)
- AI chatbot for farmer queries, English + one regional language
- Complaint classification & routing (category → department + contact + reference ID)
- Progressive Web App (installable, offline caching) — added once core web
  platform is stable

## Out of scope
- Real integration with government complaint-filing APIs (not publicly available)
- Native mobile app (only if there's real time slack after PWA is done)
- Payment / subsidy disbursement
- IoT / hardware sensors — inputs are manually entered by the farmer

## Stretch goals (only after core is stable)
- Voice input for chatbot
- Farmer login + query/complaint history dashboard
- SMS/notification alerts for weather warnings
- Native app on top of the PWA

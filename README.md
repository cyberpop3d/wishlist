# Patreon Wishlist Vote

A small React/Vite voting app for collecting wishlist votes.

## Links

Vote page:
`https://your-vercel-domain.vercel.app/`

Live results page:
`https://your-vercel-domain.vercel.app/?results=1`

Debug page:
`https://your-vercel-domain.vercel.app/?debug=1`

## Current behavior

- Visitors can submit up to 3 votes.
- The same character can receive multiple votes.
- After a successful submit, the vote is locked in that browser using localStorage.
- Reset is removed.
- Live results are shown on `?results=1`.

## Important

This browser lock prevents casual repeat voting, but it is not a true identity lock. A user can bypass it by clearing browser data, using another device, or using another browser. For a true hard lock, add email login, Patreon OAuth, or unique invite tokens.

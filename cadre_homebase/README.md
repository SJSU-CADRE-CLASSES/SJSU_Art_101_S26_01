# homebase

## Going live (GitHub Pages)

1. **Push the workflow**  
   Commit and push the new `.github/workflows/deploy-pages.yml` (and any site changes) to the `main` branch.

2. **Turn on GitHub Pages**  
   On GitHub: **Settings → Pages**. Under “Build and deployment”, set **Source** to **GitHub Actions**.

3. **Deploy**  
   After the next push to `main`, the “Deploy to GitHub Pages” workflow will run. You can also run it manually: **Actions → Deploy to GitHub Pages → Run workflow**.

4. **View the site**  
   When deployment finishes, the site is at:  
   **https://sjsu-cadre-classes.github.io/SJSU_Art_101_S26_01/**  
   - Home: `.../SJSU_Art_101_S26_01/` or `.../SJSU_Art_101_S26_01/index.html`  
   - Profile: `.../SJSU_Art_101_S26_01/Cassidy_Profile_Page.html`
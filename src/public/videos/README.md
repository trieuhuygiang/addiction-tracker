# Background Video Setup

## Add Your Background Video

Place your background video files in this directory with the following names:

- `background.mp4` - MP4 format (recommended for broad compatibility)
- `background.webm` - WebM format (optional, for better compression)

## Video Recommendations

### Format & Quality

- **Resolution**: 1920x1080 (Full HD) or 1280x720 (HD)
- **Aspect Ratio**: 16:9
- **File Size**: Keep under 10MB for faster loading
- **Duration**: 10-30 seconds (will loop automatically)
- **FPS**: 24-30 fps

### Content Suggestions

Choose calming, motivational videos that align with the website's purpose:

- Nature scenes (mountains, ocean, forests)
- Abstract geometric patterns
- Sunrise/sunset time-lapses
- Motivational workout scenes
- Peaceful meditation backgrounds

### Where to Find Free Videos

1. **Pexels Videos** - https://www.pexels.com/videos/
2. **Pixabay** - https://pixabay.com/videos/
3. **Videvo** - https://www.videvo.net/
4. **Coverr** - https://coverr.co/

## How to Optimize Your Video

### Using FFmpeg (command line)

**Convert to MP4 (H.264):**

```bash
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k -vf scale=1920:1080 background.mp4
```

**Convert to WebM (VP9):**

```bash
ffmpeg -i input.mp4 -c:v libvpx-vp9 -crf 30 -b:v 0 -vf scale=1920:1080 background.webm
```

**Reduce file size:**

```bash
ffmpeg -i background.mp4 -vcodec libx264 -crf 28 -vf scale=1280:720 background-compressed.mp4
```

### Online Tools

- **CloudConvert** - https://cloudconvert.com/
- **Online-Convert** - https://www.online-convert.com/

## Testing

After adding your video files:

1. Restart your server: `npm start`
2. Visit the homepage
3. Check that the video plays automatically
4. Verify it loops smoothly
5. Test on different devices and browsers

## Fallback

If no video is added, the website will display a solid color background as fallback.

## Performance Tips

- Use lazy loading for other page elements
- Compress video files to reduce bandwidth
- Consider using a CDN for large video files
- Test loading times on slower connections

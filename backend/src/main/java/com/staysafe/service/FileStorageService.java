package com.staysafe.service;

import com.staysafe.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Stores uploaded images on local disk (app.upload.dir). The file type is decided from the file's
 * magic bytes - the client-supplied content type / file name are never trusted. Files are served
 * from /api/files/{name}. For multi-server production deployments swap this for S3 / GCS.
 */
@Service
public class FileStorageService {
    public static final String URL_PREFIX = "/api/files/";
    private static final long MAX_BYTES = 5L * 1024 * 1024;
    private static final Pattern SAFE_NAME = Pattern.compile("[a-zA-Z0-9-]{1,80}\\.(jpg|png|webp)");

    private final Path root;

    public FileStorageService(@Value("${app.upload.dir}") String dir) {
        this.root = Paths.get(dir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot create upload directory " + root, e);
        }
    }

    /** Validates and stores an image, returns its public URL path (e.g. /api/files/avatar-....jpg). */
    public String store(MultipartFile file, String prefix) {
        if (file == null || file.isEmpty()) throw ApiException.badRequest("No file selected");
        if (file.getSize() > MAX_BYTES) throw ApiException.badRequest("Each image must be 5 MB or smaller");

        byte[] head = new byte[12];
        int n;
        try (InputStream in = file.getInputStream()) {
            n = in.readNBytes(head, 0, head.length);
        } catch (IOException e) {
            throw ApiException.badRequest("Could not read the uploaded file");
        }
        String ext = detect(head, n);
        if (ext == null) throw ApiException.badRequest("Only JPG, PNG or WebP images are allowed");

        String name = prefix + "-" + UUID.randomUUID() + "." + ext;
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, root.resolve(name), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new IllegalStateException("Could not save the uploaded file", e);
        }
        return URL_PREFIX + name;
    }

    public Resource load(String name) {
        if (name == null || !SAFE_NAME.matcher(name).matches()) return null;
        Path p = root.resolve(name).normalize();
        if (!p.startsWith(root) || !Files.isReadable(p)) return null;
        return new FileSystemResource(p);
    }

    /** Deletes a previously stored file; ignores external URLs and unknown names. */
    public void delete(String url) {
        if (url == null || !url.startsWith(URL_PREFIX)) return;
        String name = url.substring(URL_PREFIX.length());
        if (!SAFE_NAME.matcher(name).matches()) return;
        try {
            Files.deleteIfExists(root.resolve(name));
        } catch (IOException ignored) {
            // best effort
        }
    }

    private static String detect(byte[] b, int n) {
        if (n >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) return "jpg";
        if (n >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G'
                && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A) return "png";
        if (n >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return "webp";
        return null;
    }
}

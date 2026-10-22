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

@Service
public class PrivateDocumentStorageService {
    private static final long MAX_BYTES = 10L * 1024 * 1024;
    private final Path root;
    public PrivateDocumentStorageService(@Value("${app.private-document.dir:./private-documents}") String dir) {
        root = Paths.get(dir).toAbsolutePath().normalize();
        try { Files.createDirectories(root); } catch (IOException e) { throw new IllegalStateException("Cannot create private document directory", e); }
    }
    public StoredDocument store(MultipartFile file) {
        if (file == null || file.isEmpty()) throw ApiException.badRequest("Choose a document file");
        if (file.getSize() > MAX_BYTES) throw ApiException.badRequest("Documents must be 10 MB or smaller");
        byte[] b = new byte[12]; int n;
        try (InputStream in = file.getInputStream()) { n = in.readNBytes(b, 0, b.length); }
        catch (IOException e) { throw ApiException.badRequest("Cannot read document"); }
        String ext = detect(b, n);
        if (ext == null) throw ApiException.badRequest("Only PDF, JPG and PNG documents are accepted");
        String name = UUID.randomUUID() + "." + ext;
        try (InputStream in = file.getInputStream()) { Files.copy(in, root.resolve(name), StandardCopyOption.REPLACE_EXISTING); }
        catch (IOException e) { throw new IllegalStateException("Could not save document", e); }
        String original = file.getOriginalFilename() == null ? "document." + ext : Path.of(file.getOriginalFilename()).getFileName().toString();
        if (original.length() > 180) original = original.substring(original.length() - 180);
        return new StoredDocument(name, original, ext);
    }
    public Resource load(String name) {
        if (name == null || !name.matches("[a-f0-9-]{36}\\.(pdf|jpg|png)")) return null;
        Path p = root.resolve(name).normalize();
        return p.startsWith(root) && Files.isReadable(p) ? new FileSystemResource(p) : null;
    }
    public void delete(String name) { if (name != null && name.matches("[a-f0-9-]{36}\\.(pdf|jpg|png)")) try { Files.deleteIfExists(root.resolve(name)); } catch (IOException ignored) {} }
    private static String detect(byte[] b, int n) {
        if (n >= 5 && b[0] == '%' && b[1] == 'P' && b[2] == 'D' && b[3] == 'F' && b[4] == '-') return "pdf";
        if (n >= 3 && (b[0]&255)==255 && (b[1]&255)==216 && (b[2]&255)==255) return "jpg";
        if (n >= 8 && (b[0]&255)==137 && b[1]=='P' && b[2]=='N' && b[3]=='G' && b[4]==13 && b[5]==10 && b[6]==26 && b[7]==10) return "png";
        return null;
    }
    public record StoredDocument(String storageName, String originalFileName, String extension) {}
}

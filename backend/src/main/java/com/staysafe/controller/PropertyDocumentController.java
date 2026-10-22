package com.staysafe.controller;

import com.staysafe.exception.ApiException;
import com.staysafe.model.Property;
import com.staysafe.model.PropertyDocument;
import com.staysafe.model.Role;
import com.staysafe.model.User;
import com.staysafe.repo.PropertyDocumentRepository;
import com.staysafe.repo.PropertyRepository;
import com.staysafe.service.NotificationService;
import com.staysafe.service.PrivateDocumentStorageService;
import jakarta.validation.constraints.NotBlank;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/property-documents")
public class PropertyDocumentController {
    private static final List<String> TYPES = List.of("ELECTRICITY_BILL", "OWNERSHIP_PROOF", "RENTAL_AUTHORIZATION", "PROPERTY_TAX_RECEIPT", "ADDRESS_PROOF", "OTHER");
    private final PropertyDocumentRepository documents;
    private final PropertyRepository properties;
    private final PrivateDocumentStorageService storage;
    private final NotificationService notifications;

    public PropertyDocumentController(PropertyDocumentRepository documents, PropertyRepository properties,
            PrivateDocumentStorageService storage, NotificationService notifications) {
        this.documents = documents; this.properties = properties; this.storage = storage; this.notifications = notifications;
    }

    public record DocumentDto(Long id, Long propertyId, String propertyName, String documentType,
        String originalFileName, String status, String reviewRemarks, LocalDateTime uploadedAt, LocalDateTime reviewedAt) {}
    public record ReviewRequest(@NotBlank String status, String remarks) {}

    @PostMapping(value = "/property/{propertyId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public DocumentDto upload(@PathVariable Long propertyId, @AuthenticationPrincipal User user,
            @RequestParam String documentType, @RequestParam("file") MultipartFile file) {
        if (user.getRole() != Role.OWNER) throw ApiException.forbidden("Only property owners can upload listing documents");
        if (!TYPES.contains(documentType)) throw ApiException.badRequest("Unsupported document type");
        Property p = properties.findById(propertyId).orElseThrow(() -> ApiException.notFound("Property not found"));
        if (!p.getOwner().getId().equals(user.getId())) throw ApiException.forbidden("Not your property");
        var stored = storage.store(file);
        PropertyDocument d = new PropertyDocument(); d.setProperty(p); d.setUploadedBy(user);
        d.setDocumentType(documentType); d.setOriginalFileName(stored.originalFileName()); d.setStorageName(stored.storageName());
        d.setStatus("PENDING_REVIEW");
        PropertyDocument saved = documents.save(d);
        notifications.notifyRole(Role.ADMIN, "Property document submitted", p.getName() + " has a new " + documentType + " document for review.", "audit", "property-document", saved.getId());
        return dto(saved);
    }

    @GetMapping("/property/{propertyId}")
    public List<DocumentDto> mine(@PathVariable Long propertyId, @AuthenticationPrincipal User user) {
        Property p = properties.findById(propertyId).orElseThrow(() -> ApiException.notFound("Property not found"));
        if (user.getRole() != Role.ADMIN && !p.getOwner().getId().equals(user.getId())) throw ApiException.forbidden("Not your property");
        return documents.findByPropertyOrderByUploadedAtDesc(p).stream().map(PropertyDocumentController::dto).toList();
    }

    @GetMapping("/admin/pending")
    public List<DocumentDto> pending(@AuthenticationPrincipal User admin) {
        requireAdmin(admin);
        return documents.findByStatusOrderByUploadedAtAsc("PENDING_REVIEW").stream().map(PropertyDocumentController::dto).toList();
    }

    @PutMapping("/admin/{id}/review")
    public DocumentDto review(@PathVariable Long id, @AuthenticationPrincipal User admin, @RequestBody ReviewRequest req) {
        requireAdmin(admin);
        if (!List.of("APPROVED", "REJECTED", "PENDING_REVIEW").contains(req.status())) throw ApiException.badRequest("Invalid document review status");
        PropertyDocument d = documents.findById(id).orElseThrow(() -> ApiException.notFound("Document not found"));
        d.setStatus(req.status()); d.setReviewRemarks(req.remarks()); d.setReviewedAt(LocalDateTime.now());
        PropertyDocument saved = documents.save(d);
        notifications.notify(d.getUploadedBy(), "Property document " + req.status().toLowerCase(),
            d.getDocumentType() + " for " + d.getProperty().getName() + " was " + req.status().toLowerCase()
                + (req.remarks() == null || req.remarks().isBlank() ? "." : ": " + req.remarks()),
            "audit", "property-document", d.getId());
        return dto(saved);
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable Long id, @AuthenticationPrincipal User user) {
        PropertyDocument d = documents.findById(id).orElseThrow(() -> ApiException.notFound("Document not found"));
        if (user.getRole() != Role.ADMIN && !d.getUploadedBy().getId().equals(user.getId())) throw ApiException.forbidden("Not allowed to view this document");
        Resource r = storage.load(d.getStorageName());
        if (r == null) return ResponseEntity.notFound().build();
        String ext = d.getStorageName().substring(d.getStorageName().lastIndexOf('.') + 1);
        MediaType type = ext.equals("pdf") ? MediaType.APPLICATION_PDF : ext.equals("png") ? MediaType.IMAGE_PNG : MediaType.IMAGE_JPEG;
        return ResponseEntity.ok().contentType(type).header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"property-document-" + d.getId() + "." + ext + "\"")
                .header("X-Content-Type-Options", "nosniff").body(r);
    }

    private static void requireAdmin(User user) { if (user.getRole() != Role.ADMIN) throw ApiException.forbidden("Admin access required"); }
    private static DocumentDto dto(PropertyDocument d) { return new DocumentDto(d.getId(), d.getProperty().getId(), d.getProperty().getName(), d.getDocumentType(), d.getOriginalFileName(), d.getStatus(), d.getReviewRemarks(), d.getUploadedAt(), d.getReviewedAt()); }
}

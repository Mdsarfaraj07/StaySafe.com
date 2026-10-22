package com.staysafe.repo;

import com.staysafe.model.Property;
import com.staysafe.model.PropertyDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PropertyDocumentRepository extends JpaRepository<PropertyDocument, Long> {
    List<PropertyDocument> findByPropertyOrderByUploadedAtDesc(Property property);
    List<PropertyDocument> findByStatusOrderByUploadedAtAsc(String status);
    boolean existsByPropertyAndDocumentTypeAndStatus(Property property, String documentType, String status);
    long countByPropertyAndStatus(Property property, String status);
}

package com.staysafe.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/** Stores List<String> in a single column, separated by '|'. */
@Converter
public class StringListConverter implements AttributeConverter<List<String>, String> {
    @Override
    public String convertToDatabaseColumn(List<String> list) {
        return list == null ? "" : String.join("|", list);
    }

    @Override
    public List<String> convertToEntityAttribute(String db) {
        if (db == null || db.isBlank()) return new ArrayList<>();
        return new ArrayList<>(Arrays.asList(db.split("\\|")));
    }
}

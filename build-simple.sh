#!/bin/bash
# Simplified Include System - HTML files with include markers
# Perfect for future CMS integration

echo "🔨 Processing HTML files with include markers..."

# Function to process includes in HTML files
process_html_includes() {
    local html_file="$1"
    local temp_file=$(mktemp)
    
    echo "📄 Processing: $html_file"
    
    # Copy original to temp
    cp "$html_file" "$temp_file"
    
    # Process each include marker pair
    local processed_count=0
    local max_iterations=20  # Safety limit
    
    while grep -q "<!-- INCLUDE START:" "$temp_file" && [[ $processed_count -lt $max_iterations ]]; do
        # Find first include start marker
        start_line=$(grep -n "<!-- INCLUDE START:" "$temp_file" | head -1 | cut -d: -f1)
        
        if [[ -z "$start_line" ]]; then
            break
        fi
        
        # Extract include filename (everything between START: and -->)
        include_line=$(sed -n "${start_line}p" "$temp_file")
        include_file=$(echo "$include_line" | sed 's/.*<!-- INCLUDE START: \([^ ]*\) .*/\1/')
        
        echo "  🔍 Processing include: $include_file (iteration $((processed_count + 1)))"
        
        # Find corresponding end marker
        end_search=$(tail -n +$((start_line + 1)) "$temp_file" | grep -n "<!-- INCLUDE END: $include_file" | head -1 | cut -d: -f1)
        
        if [[ -z "$end_search" ]]; then
            echo "  ⚠️  Warning: No end marker found for $include_file"
            # Remove just the start line to prevent infinite loop
            sed -i "${start_line}d" "$temp_file"
            ((processed_count++))
            continue
        fi
        
        end_line=$((start_line + end_search))
        
        # Add includes/ prefix if needed
        include_path="$include_file"
        if [[ "$include_file" != includes/* && -f "includes/$include_file" ]]; then
            include_path="includes/$include_file"
        fi
        
        if [[ -f "$include_path" ]]; then
            echo "  📎 Including: $include_path"
            
            # Create new temp file with include replaced
            new_temp=$(mktemp)
            
            # Copy lines before start marker
            head -n $((start_line - 1)) "$temp_file" > "$new_temp"
            
            # Add start marker
            echo "<!-- INCLUDE START: $include_file -->" >> "$new_temp"
            
            # Add the included content
            cat "$include_path" >> "$new_temp"
            
            # Add end marker  
            echo "<!-- INCLUDE END: $include_file -->" >> "$new_temp"
            
            # Copy lines after end marker
            tail -n +$((end_line + 1)) "$temp_file" >> "$new_temp"
            
            # Replace temp file
            mv "$new_temp" "$temp_file"
        else
            echo "  ⚠️  Include file not found: $include_path"
            # Remove the include block to prevent infinite loop
            sed -i "${start_line},${end_line}d" "$temp_file"
        fi
        
        ((processed_count++))
    done
    
    if [[ $processed_count -ge $max_iterations ]]; then
        echo "  ⚠️  Warning: Reached maximum iterations limit for $html_file"
    fi
    
    # Update original file
    mv "$temp_file" "$html_file"
    echo "  ✅ Updated: $html_file"
}

# Process all HTML files in current directory (not in includes/)
html_count=0
for html_file in *.html; do
    if [[ -f "$html_file" && "$html_file" != includes/* ]]; then
        # Skip files that look auto-generated
        if ! head -1 "$html_file" | grep -q "AUTO-GENERATED"; then
            process_html_includes "$html_file"
            ((html_count++))
        fi
    fi
done

if [[ $html_count -eq 0 ]]; then
    echo "📁 No HTML files with include markers found"
    echo "💡 Add include markers like: <!-- INCLUDE START: header.html --> ... <!-- INCLUDE END: header.html -->"
else
    echo ""
    echo "🎉 Build complete! Processed $html_count HTML file(s)"
    echo ""
    echo "📝 Include marker syntax:"
    echo "   <!-- INCLUDE START: header.html -->"
    echo "   [content gets inserted here]"
    echo "   <!-- INCLUDE END: header.html -->"
    echo ""
    echo "🎯 CMS-Ready: Content between include markers is user-editable"
fi

# Ensure script exits with success
exit 0


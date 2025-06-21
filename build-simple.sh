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
    
    # Simple approach: Find includes with placeholder content and process them
    local changes_made=1
    local iterations=0
    local max_iterations=10
    
    while [[ $changes_made -eq 1 && $iterations -lt $max_iterations ]]; do
        changes_made=0
        ((iterations++))
        
        echo "  🔄 Pass $iterations: Looking for unprocessed includes"
        
        # Find include blocks that still have placeholder content
        while IFS= read -r line_info; do
            if [[ -z "$line_info" ]]; then
                continue
            fi
            
            start_line=$(echo "$line_info" | cut -d: -f1)
            include_file=$(echo "$line_info" | sed 's/.*<!-- INCLUDE START: \([^ ]*\) .*/\1/')
            
            # Check if this include has placeholder content (comment on next line)
            next_line_content=$(sed -n "$((start_line + 1))p" "$temp_file")
            if [[ "$next_line_content" =~ ^[[:space:]]*\<!--.*--\>[[:space:]]*$ ]]; then
                echo "    📎 Processing: $include_file"
                
                # Find end marker
                end_line=$(tail -n +$start_line "$temp_file" | grep -n "<!-- INCLUDE END: $include_file" | head -1 | cut -d: -f1)
                if [[ -n "$end_line" ]]; then
                    end_line=$((start_line + end_line - 1))
                    
                    # Add includes/ prefix if needed
                    include_path="$include_file"
                    if [[ "$include_file" != includes/* && -f "includes/$include_file" ]]; then
                        include_path="includes/$include_file"
                    fi
                    
                    if [[ -f "$include_path" ]]; then
                        # Replace content between markers
                        {
                            head -n $start_line "$temp_file"
                            cat "$include_path"
                            tail -n +$end_line "$temp_file"
                        } > "${temp_file}.new"
                        mv "${temp_file}.new" "$temp_file"
                        changes_made=1
                        echo "    ✅ Included: $include_path"
                        break  # Process one at a time
                    else
                        echo "    ⚠️  File not found: $include_path"
                    fi
                else
                    echo "    ⚠️  No end marker for: $include_file"
                fi
            fi
        done < <(grep -n "<!-- INCLUDE START:" "$temp_file")
    done
    
    if [[ $iterations -ge $max_iterations ]]; then
        echo "  ⚠️  Reached maximum iterations ($max_iterations)"
    fi
    
    echo "  ✅ Completed $iterations passes"
    
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


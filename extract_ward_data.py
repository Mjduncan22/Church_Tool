import fitz  # PyMuPDF
import json
import re
import os
import sys

def process_directory(pdf_path, base_output="public"):
    # Use the PDF filename to create a specific semester folder
    pdf_filename = os.path.basename(pdf_path)
    semester_name = os.path.splitext(pdf_filename)[0].replace(" ", "_") # e.g., Fall_Semester_2026
    
    # Create the dedicated image folder inside Next.js public directory
    image_folder = os.path.join(base_output, semester_name)
    os.makedirs(image_folder, exist_ok=True)
    
    doc = fitz.open(pdf_path)
    ward_data = []
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        page_width = page.rect.width
        col_width = page_width / 4 # 4 columns
        
        # 1. EXTRACT IMAGES WITH COORDINATES
        page_images = []
        for img in page.get_image_info(xrefs=True):
            xref = img["xref"]
            bbox = fitz.Rect(img["bbox"]) # The visual boundaries of the image on the page
            
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]
            ext = base_image["ext"]
            
            filename = f"face_p{page_num}_{xref}.{ext}"
            filepath = os.path.join(image_folder, filename)
            
            # Save the image file
            with open(filepath, "wb") as f:
                f.write(image_bytes)
                
            # Store the location data so we can map it to a person later
            page_images.append({
                "bbox": bbox,
                "relative_path": f"{semester_name}/{filename}"
            })
        
        # 2. FIND APARTMENT HEADERS
        blocks = page.get_text("blocks")
        apts = []
        for b in blocks:
            text = b[4].strip()
            apt_match = re.search(r"APT\s+(\d+)", text, re.IGNORECASE)
            if apt_match and "tenants" in text.lower():
                apts.append({"y0": b[1], "apt": apt_match.group(1)})
                
        # 3. USE VIRTUAL BOUNDING BOXES FOR EACH PERSON
        for b in blocks:
            text = b[4].strip()
            prefers_match = re.search(r"^\(Prefers\s+(.+)\)$", text, re.MULTILINE | re.IGNORECASE)
            
            if prefers_match:
                x0, y0, x1, y1 = b[:4]
                preferred_name = prefers_match.group(1).strip()
                
                # Determine current apartment
                current_apt = ""
                valid_apts = [a for a in apts if a["y0"] < y0]
                if valid_apts:
                    current_apt = max(valid_apts, key=lambda a: a["y0"])["apt"]
                
                # Draw the virtual rectangle around this specific person's box
                col_index = int(x0 // col_width)
                box_x0 = col_index * col_width
                box_x1 = box_x0 + col_width
                box_y0 = y0 - 150 # Extend up to capture the photo
                box_y1 = y1 + 10  # Extend down past the text
                
                person_rect = fitz.Rect(box_x0, box_y0, box_x1, box_y1)
                
                # 4. MAP THE IMAGE TO THE PERSON
                assigned_image = "placeholder.png"
                for img_data in page_images:
                    # If the image's bounding box intersects with the person's bounding box
                    if person_rect.intersects(img_data["bbox"]):
                        assigned_image = img_data["relative_path"]
                        break # Found their photo, stop looking
                
                # Extract clean text strictly from inside this box
                box_text_raw = page.get_text("text", clip=person_rect).strip()
                box_lines = [line.strip() for line in box_text_raw.split('\n') if line.strip()]
                
                # Parse Name
                full_name = "Unknown"
                raw_name = ""
                for i, line in enumerate(box_lines):
                    if "(Prefers" in line and i > 0:
                        raw_name = box_lines[i-1]
                        if "," in raw_name:
                            parts = raw_name.split(",", 1)
                            full_name = f"{parts[1].strip()} {parts[0].strip()}"
                        else:
                            full_name = raw_name
                        break
                
                # Parse Location
                location = "Unknown"
                for line in box_lines:
                    if re.search(r",\s*[A-Z]{2}", line):
                        location = line
                        break
                
                if location == "Unknown":
                    for line in box_lines:
                        if "Photo" not in line and "Unavailable" not in line and "(Prefers" not in line and line != raw_name:
                            location = line
                            break
                            
                ward_data.append({
                    "full_name": full_name,
                    "preferred_name": preferred_name,
                    "location": location,
                    "apt": current_apt,
                    "image": assigned_image 
                })
                
    with open("ward_data.json", "w", encoding="utf-8") as f:
        json.dump(ward_data, f, indent=4)
        
    print(f"Extracted {len(ward_data)} members into {image_folder}/")

if __name__ == "__main__":
    pdf_target = sys.argv[1] if len(sys.argv) > 1 else "data/Fall Semester 2026.pdf"
    process_directory(pdf_target)
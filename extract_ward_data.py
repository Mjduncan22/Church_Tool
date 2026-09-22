import json
import re
import sys
from pathlib import Path

import pymupdf


REPO_ROOT = Path(__file__).resolve().parent


def process_directory(pdf_path, base_output="public"):
    pdf_path = Path(pdf_path)
    if not pdf_path.is_absolute():
        pdf_path = REPO_ROOT / pdf_path

    semester_name = pdf_path.stem.replace(" ", "_")
    output_root = REPO_ROOT / base_output
    image_folder = output_root / semester_name
    image_folder.mkdir(parents=True, exist_ok=True)

    doc = pymupdf.open(pdf_path)
    ward_data = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        page_images = []
        for image_index, image_info in enumerate(page.get_image_info(xrefs=True)):
            bbox = pymupdf.Rect(image_info["bbox"])
            image_data = doc.extract_image(image_info["xref"])
            filename = f"face_p{page_num}_{image_index}.{image_data['ext']}"
            (image_folder / filename).write_bytes(image_data["image"])
            page_images.append({
                "bbox": bbox,
                "relative_path": f"{semester_name}/{filename}",
            })

        blocks = page.get_text("blocks")
        apartments = []
        for block in blocks:
            text = block[4].strip()
            apartment_match = re.search(r"APT\s+(\d+)", text, re.IGNORECASE)
            if apartment_match and "tenants" in text.lower():
                apartments.append({"y0": block[1], "apt": apartment_match.group(1)})

        metadata_blocks = [
            block for block in blocks
            if "Home Unit" in block[4] and "@byui.edu" in block[4]
        ]
        person_blocks = [
            block for block in blocks
            if re.search(r"^.+\n\(Prefers\s*.*\)$", block[4].strip(), re.IGNORECASE)
        ]

        for person_block in person_blocks:
            person_lines = [
                line.strip() for line in person_block[4].splitlines() if line.strip()
            ]
            preferred_match = re.match(
                r"^\(Prefers\s*(.*?)\)$", person_lines[-1], re.IGNORECASE
            )
            if not preferred_match:
                continue

            full_name = person_lines[0]
            if full_name == "*,":
                full_name = "Unknown"
            preferred_name = preferred_match.group(1).strip()

            matching_images = [
                image for image in page_images
                if image["bbox"].x0 <= person_block[0] + 5
                and image["bbox"].x1 >= person_block[0] - 5
                and image["bbox"].y1 <= person_block[1]
            ]
            if matching_images:
                image = max(matching_images, key=lambda item: item["bbox"].y1)
                image_path = image["relative_path"]
                image_x0 = image["bbox"].x0
                image_y0 = image["bbox"].y0
                image_y1 = image["bbox"].y1
            else:
                image_path = "placeholder.png"
                image_x0 = person_block[0]
                image_y0 = person_block[1]
                image_y1 = person_block[1]

            matching_metadata = [
                block for block in metadata_blocks
                if image_x0 - 5 <= block[0] <= image_x0 + 105
                and block[1] <= person_block[1]
                and block[3] >= image_y0 - 8
            ]
            if matching_metadata:
                metadata_text = min(
                    matching_metadata, key=lambda block: abs(block[1] - image_y1)
                )[4]
                metadata_lines = [
                    line.strip() for line in metadata_text.splitlines() if line.strip()
                ]
                home_unit_index = next(
                    (index for index, line in enumerate(metadata_lines)
                     if line.startswith("Home Unit")),
                    len(metadata_lines),
                )
                location = " ".join(metadata_lines[:home_unit_index]) or "Unknown"
            else:
                location = "Unknown"

            valid_apartments = [
                apartment for apartment in apartments
                if apartment["y0"] < person_block[1]
            ]
            apartment = (
                max(valid_apartments, key=lambda item: item["y0"])["apt"]
                if valid_apartments else ""
            )

            if not any(
                member["full_name"] == full_name and member["apt"] == apartment
                for member in ward_data
            ):
                ward_data.append({
                    "full_name": full_name,
                    "preferred_name": preferred_name,
                    "location": location,
                    "apt": apartment,
                    "image": image_path,
                })

    output_path = output_root / "ward_data.json"
    output_path.write_text(json.dumps(ward_data, indent=4), encoding="utf-8")
    print(f"Extracted {len(ward_data)} members into {image_folder}/")


if __name__ == "__main__":
    pdf_target = sys.argv[1] if len(sys.argv) > 1 else "data/Fall Semester 2026.pdf"
    process_directory(pdf_target)

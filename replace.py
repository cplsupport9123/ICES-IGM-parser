import re

# -----------------------------
# Step 1: Parse BAPLIE and extract container numbers
# -----------------------------
def extract_baplie_containers(baplie_file):
    containers = []
    with open(baplie_file, "r") as f:
        data = f.read().split("'")  # EDIFACT segment terminator
        for segment in data:
            segment = segment.strip()
            if segment.startswith("EQD+CN+"):
                parts = segment.split("+")
                container_no = parts[2].replace(" ", "") if len(parts) > 2 else None
                if container_no:
                    containers.append(container_no)
    return containers

# -----------------------------
# Step 2: Read IGM file
# -----------------------------
def read_igm(igm_file):
    with open(igm_file, "r") as f:
        return f.readlines()

# -----------------------------
# Step 3: Update only <contain> section, field 5
# -----------------------------
def update_igm_containers_in_contain_section(igm_lines, baplie_containers):
    new_lines = []
    in_contain_section = False
    container_index = 0

    for line in igm_lines:
        stripped_line = line.strip().lower()
        if stripped_line == "<contain>":
            in_contain_section = True
        elif stripped_line == "<end-contain>":
            in_contain_section = False

        if in_contain_section and container_index < len(baplie_containers):
            # Split by the special delimiter ''
            parts = line.split("")
            if len(parts) > 4:  # Make sure field 5 exists
                parts[4] = baplie_containers[container_index]  # Replace container number
                container_index += 1
                line = "".join(parts)

        new_lines.append(line)

    if container_index < len(baplie_containers):
        print(f"Warning: {len(baplie_containers) - container_index} containers from BAPLIE not used.")
    return new_lines

# -----------------------------
# Step 4: Save updated IGM
# -----------------------------
def save_updated_igm(updated_lines, output_file):
    with open(output_file, "w") as f:
        f.writelines(updated_lines)
    print(f"Updated IGM saved to {output_file}")

# -----------------------------
# Main script
# -----------------------------
if __name__ == "__main__":
    baplie_file = "baplie.edi"
    igm_file = "igm.sgm"
    output_file = "igm_updated.sgm"

    baplie_containers = extract_baplie_containers(baplie_file)
    print(f"Found {len(baplie_containers)} containers in BAPLIE.")

    igm_lines = read_igm(igm_file)
    updated_lines = update_igm_containers_in_contain_section(igm_lines, baplie_containers)

    save_updated_igm(updated_lines, output_file)

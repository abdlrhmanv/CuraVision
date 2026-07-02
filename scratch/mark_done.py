import re

file_path = '/home/abdlrhman/Courses/DEPI/Microsoft Machine Learning Engineer/GP/docs/qa_manual_test_plan.md'

with open(file_path, 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.startswith('| TC-AUTH-') or line.startswith('| TC-RBAC-'):
        line = line.replace('| [ ] |', '| [x] |')
    new_lines.append(line)

with open(file_path, 'w') as f:
    f.writelines(new_lines)

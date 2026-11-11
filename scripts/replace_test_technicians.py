"""Create usable replacement test technicians and block the old synthetic profiles.

Reads a one-line JSON login object from stdin. Never saves or prints credentials.
"""
import json
import sys
import urllib.error
import urllib.request

BASE = 'http://141.136.42.95:8000/api'
OLD = {'Houssame Test': 3, 'Rahiche Test': 4}
NEW = {'Houssame Test': '770000001', 'Rahiche Test': '770000002'}


def request(method, path, body=None, token=None):
    headers = {'Accept': 'application/json', 'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    payload = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=25) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors='replace')[:450]
        raise RuntimeError(f'{method} {path}: HTTP {error.code}: {detail}') from None


def object_from(response):
    return response.get('technician') or response.get('data') or response


def main():
    credentials = json.loads(sys.stdin.readline())
    token = request('POST', '/admin/login', credentials)['token']
    credentials.clear()
    result = []
    try:
        listings = request('GET', '/admin/technicians?per_page=100', token=token).get('technicians', [])
        by_id = {item['id']: item for item in listings}
        for name, old_id in OLD.items():
            old = by_id.get(old_id)
            if not old or ' '.join([old.get('user', {}).get('first_name', ''), old.get('user', {}).get('last_name', '')]) != name:
                raise RuntimeError(f'Old fixture {old_id} does not match {name}; stopped before modifying it')
        for name, phone in NEW.items():
            existing = next((item for item in listings if item.get('user', {}).get('phone_number') == phone), None)
            if existing and ' '.join([existing.get('user', {}).get('first_name', ''), existing.get('user', {}).get('last_name', '')]) != name:
                raise RuntimeError(f'Phone {phone} already belongs to a different account')
        for name, phone in NEW.items():
            old = by_id[OLD[name]]
            existing = next((item for item in listings if item.get('user', {}).get('phone_number') == phone), None)
            if existing:
                replacement = existing
            else:
                first, last = name.split(' ', 1)
                body = {'first_name': first, 'last_name': last, 'phone_number': phone,
                        'technician_type': old.get('technician_type') or 'technician',
                        'fields': old.get('fields') or [], 'devices': old.get('devices') or [],
                        'is_points_based': old.get('is_points_based', False),
                        'latitude': 36.75, 'longitude': 3.05, 'radius': 50}
                replacement = object_from(request('POST', '/admin/technicians', body, token))
            verified = object_from(request('GET', f"/admin/technicians/{replacement['id']}", token=token))
            if verified.get('user', {}).get('phone_number') != phone:
                raise RuntimeError(f'Could not verify replacement for {name}')
            if not old.get('is_blocked'):
                request('POST', f'/admin/technicians/{OLD[name]}/block', {}, token)
            result.append({'name': name, 'id': replacement['id'], 'phone_number': phone, 'old_id_blocked': OLD[name]})
        print(json.dumps({'status': 'complete', 'replacements': result}))
    finally:
        try:
            request('POST', '/admin/logout', {}, token)
        except Exception:
            pass


if __name__ == '__main__':
    main()
